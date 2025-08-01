// ===== File: app/layout.tsx =====

import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { CartModal } from "@/components/CartModal";

const vazirmatn = Vazirmatn({ subsets: ["arabic"] });

export const metadata: Metadata = {
  title: "فروشگاه اینترنتی من",
  description: "بهترین محصولات با بهترین قیمت",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={vazirmatn.className}>
        <CartProvider>
          <div className="navbar bg-base-100 shadow-md sticky top-0 z-10">
            <div className="flex-1">
              <a className="btn btn-ghost text-xl">فروشگاه من</a>
            </div>
            <div className="flex-none">
              <CartModal />
            </div>
          </div>
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
