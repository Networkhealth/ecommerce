// ===== File: components/CartModal.tsx =====

"use client";

import { useCart } from "@/context/CartContext";
import { useState } from "react";

export function CartModal() {
    const { items, totalPrice, totalItems, updateQuantity, removeFromCart, clearCart } = useCart();
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const handleCheckout = async () => {
        setIsCheckingOut(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const cartItems = items.map(item => ({ productId: item.id, quantity: item.quantity }));
        
        try {
            const response = await fetch(`${apiUrl}/api/orders/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cartItems,
                    callback_url: window.location.origin + '/payment/callback'
                })
            });

            const data = await response.json();

            if (data.success && data.paymentUrl) {
                clearCart();
                window.location.href = data.paymentUrl;
            } else {
                alert('خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید.');
                console.error('Checkout failed:', data.error);
            }
        } catch (error) {
            alert('یک خطای پیش‌بینی نشده رخ داد.');
            console.error('Checkout fetch error:', error);
        } finally {
            setIsCheckingOut(false);
        }
    };

    return (
        <details className="dropdown dropdown-end">
            <summary tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                <div className="indicator">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    {totalItems > 0 && <span className="badge badge-sm indicator-item">{totalItems}</span>}
                </div>
            </summary>
            <div tabIndex={0} className="mt-3 z-[1] card card-compact dropdown-content w-80 bg-base-100 shadow">
                <div className="card-body">
                    <span className="font-bold text-lg">{totalItems} آیتم</span>
                    <div className="max-h-60 overflow-y-auto my-2">
                        {items.length > 0 ? items.map(item => (
                            <div key={item.id} className="flex justify-between items-center mb-2">
                                <span>{item.name}</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="btn btn-xs">-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="btn btn-xs">+</button>
                                </div>
                                <button onClick={() => removeFromCart(item.id)} className="btn btn-xs btn-circle btn-error text-white">✕</button>
                            </div>
                        )) : <p className="text-center text-gray-400">سبد خرید شما خالی است.</p>}
                    </div>
                    <span className="text-info">مجموع: {totalPrice.toLocaleString()} تومان</span>
                    <div className="card-actions">
                        <button 
                            className="btn btn-primary btn-block"
                            onClick={handleCheckout}
                            disabled={isCheckingOut || items.length === 0}
                        >
                            {isCheckingOut ? 'در حال اتصال...' : 'پرداخت'}
                        </button>
                    </div>
                </div>
            </div>
        </details>
    );
}
