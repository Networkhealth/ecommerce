// ===== File: app/page.tsx =====

import { Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';

async function getProducts(): Promise<Product[]> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        throw new Error("API URL is not defined in environment variables.");
    }

    try {
        const res = await fetch(`${apiUrl}/api/products`, {
             // ISR: Revalidate data every 60 seconds.
            next: { revalidate: 60 },
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch products, status: ${res.status}`);
        }
        
        const data = await res.json<{ success: boolean; products: Product[] }>();

        if (!data.success) {
             throw new Error('API request was not successful');
        }
        
        return data.products;
    } catch (error) {
        console.error("Product Fetch Error:", error);
        return [];
    }
}

export default async function HomePage() {
    const products = await getProducts();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold text-center text-gray-800 mb-10">محصولات ما</h1>
            
            {products.length === 0 ? (
                <p className="text-center text-gray-500">محصولی برای نمایش یافت نشد.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {products.map((product) => (
                       <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
}
