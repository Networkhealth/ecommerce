// ===== src/index.ts (Production-Ready Version) =====
// This is the complete backend logic for your e-commerce store.
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ===== TYPES & INTERFACES =====
// Defines the structure of our Product data.
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
}

// Defines the structure of items received from the frontend cart.
interface CartItem {
    productId: string;
    quantity: number;
}

// Defines the environment variables and bindings available to our worker.
type Bindings = {
  PRODUCTS_KV: KVNamespace;    // Binding for our product catalog (Key-Value store)
  DB: D1Database;              // Binding for our orders database (Relational DB)
  ZARINPAL_MERCHANT_ID: string; // Secret key for ZarinPal
};


// ===== CORE LOGIC & API ROUTES =====
// Initialize the Hono app, which is a lightweight web framework for Workers.
const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all API routes to allow the frontend to make requests.
app.use('/api/*', cors());


// --- API Route to fetch all products ---
// Handles GET requests to /api/products
app.get('/api/products', async (c) => {
    // List all keys in the PRODUCTS_KV namespace.
    const { keys } = await c.env.PRODUCTS_KV.list();
    // Fetch all product details concurrently for better performance.
    const productPromises = keys.map(key => c.env.PRODUCTS_KV.get<Product>(key.name, 'json'));
    const products = await Promise.all(productPromises);
    // Return a successful response with the list of products, filtering out any nulls.
    return c.json({ success: true, products: products.filter(p => p !== null) });
});


// --- API Route to create an order and initiate payment ---
// Handles POST requests to /api/orders/create
app.post('/api/orders/create', async (c) => {
    // Get the cart items and the frontend callback URL from the request body.
    const { items, callback_url } = await c.req.json<{ items: CartItem[], callback_url: string }>();

    // Validate the input.
    if (!items || items.length === 0 || !callback_url) {
        return c.json({ success: false, error: 'Cart items and callback URL are required.' }, 400);
    }

    // --- SECURITY: Calculate the total amount on the server, never trust the client. ---
    let totalAmount = 0;
    try {
        for (const item of items) {
            const product = await c.env.PRODUCTS_KV.get<Product>(item.productId, 'json');
            if (product) {
                totalAmount += product.price * item.quantity;
            } else {
                // If a product is not found, reject the transaction.
                return c.json({ success: false, error: `Product with ID ${item.productId} not found.` }, 404);
            }
        }
    } catch (e) {
        console.error("Error calculating total amount:", e);
        return c.json({ success: false, error: "Error processing cart" }, 500);
    }
    
    // Create a new order record in our D1 database with a 'PENDING' status.
    const orderId = `ORDER_${crypto.randomUUID()}`;
    await c.env.DB.prepare("INSERT INTO orders (id, amount, status, created_at) VALUES (?, ?, ?, ?)")
      .bind(orderId, totalAmount, 'PENDING', new Date().toISOString())
      .run();
    
    // --- Request a payment link from ZarinPal's API ---
    const zarinpalResponse = await fetch('https://api.zarinpal.com/pg/v4/payment/request.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            merchant_id: c.env.ZARINPAL_MERCHANT_ID,
            amount: totalAmount,
            callback_url: `${callback_url}?orderId=${orderId}`, // Append orderId for tracking
            description: `Order from ecommerce-worker - ${orderId}`,
        }),
    });

    const zarinpalResult = await zarinpalResponse.json<{ data: any, errors: any }>();

    // If ZarinPal provides a payment authority, save it and return the payment URL.
    if (zarinpalResult.data && zarinpalResult.data.authority) {
        const authority = zarinpalResult.data.authority;
        // Store the authority to verify it later.
        await c.env.DB.prepare("UPDATE orders SET authority = ? WHERE id = ?").bind(authority, orderId).run();
        const paymentUrl = `https://www.zarinpal.com/pg/StartPay/${authority}`;
        return c.json({ success: true, paymentUrl });
    } else {
        // If ZarinPal fails, log the error and inform the client.
        console.error("ZarinPal request failed:", zarinpalResult.errors);
        return c.json({ success: false, error: 'Failed to get payment URL from ZarinPal' }, 500);
    }
});


// --- API Route to verify the payment after user returns from ZarinPal ---
// Handles GET requests to /api/payment/callback
app.get('/api/payment/callback', async (c) => {
    // Extract query parameters sent by ZarinPal.
    const { orderId, Authority, Status } = c.req.query();

    // Validate callback parameters.
    if (!orderId || !Authority || !Status) {
        return c.json({ success: false, error: 'Invalid callback parameters' }, 400);
    }

    // If the user cancelled the payment.
    if (Status !== 'OK') {
        await c.env.DB.prepare("UPDATE orders SET status = 'FAILED' WHERE id = ?").bind(orderId).run();
        return c.json({ success: false, message: 'Payment cancelled by user.' });
    }

    // Fetch the order from our database to get the original amount.
    const orderResult = await c.env.DB.prepare("SELECT amount FROM orders WHERE id = ?").bind(orderId).first<{amount: number}>();
    if (!orderResult) {
        return c.json({ success: false, error: 'Order not found' }, 404);
    }

    // --- SECURITY: Verify the transaction with ZarinPal's server. ---
    const verificationResponse = await fetch('https://api.zarinpal.com/pg/v4/payment/verify.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
            merchant_id: c.env.ZARINPAL_MERCHANT_ID,
            amount: orderResult.amount, // Use the amount from our database
            authority: Authority,
        }),
    });

    const verificationResult = await verificationResponse.json<{ data: any, errors: any }>();

    // ZarinPal's success code is 100.
    if (verificationResult.data && verificationResult.data.code === 100) {
        // If successful, update the order status to 'COMPLETED'.
        await c.env.DB.prepare("UPDATE orders SET status = 'COMPLETED' WHERE id = ?").bind(orderId).run();
        return c.json({ success: true, message: 'Payment successful', refId: verificationResult.data.ref_id });
    } else {
        // If verification fails, update status to 'FAILED' and log the error.
        await c.env.DB.prepare("UPDATE orders SET status = 'FAILED' WHERE id = ?").bind(orderId).run();
        console.error("ZarinPal verification failed:", verificationResult.errors);
        return c.json({ success: false, error: 'Payment verification failed' }, 400);
    }
});

// Export the app to be handled by the Cloudflare Workers runtime.
export default app;
