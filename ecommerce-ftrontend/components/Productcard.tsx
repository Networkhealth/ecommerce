// ===== File: components/ProductCard.tsx =====

"use client";

import { Product } from '@/types';
import { useCart } from '@/context/CartContext';

export function ProductCard({ product }: { product: Product }) {
    const { addToCart } = useCart();

    return (
        <div className="bg-white border rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105">
            <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover" />
            <div className="p-4 text-right">
                <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
                <p className="text-gray-600 text-sm mb-4 h-16 overflow-hidden">{product.description}</p>
                <div className="flex justify-between items-center mt-4">
                    <p className="text-lg font-bold text-indigo-600">{product.price.toLocaleString()} تومان</p>
                    <button 
                        onClick={() => addToCart(product)}
                        className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                    >
                        افزودن به سبد
                    </button>
                </div>
            </div>
        </div>
    );
}
