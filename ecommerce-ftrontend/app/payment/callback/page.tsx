// ===== File: app/payment/callback/page.tsx =====

"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentCallbackPage() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('در حال بررسی وضعیت پرداخت...');

    useEffect(() => {
        const orderId = searchParams.get('orderId');
        const authority = searchParams.get('Authority');
        const paymentStatus = searchParams.get('Status');
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;

        const verifyPayment = async () => {
            if (!apiUrl) {
                setStatus('error');
                setMessage('خطا: آدرس API تعریف نشده است.');
                return;
            }
            try {
                const response = await fetch(`${apiUrl}/api/payment/callback?orderId=${orderId}&Authority=${authority}&Status=${paymentStatus}`);
                const data = await response.json();

                if (response.ok && data.success) {
                    setStatus('success');
                    setMessage(`پرداخت موفقیت‌آمیز بود! کد پیگیری: ${data.refId}`);
                } else {
                    setStatus('error');
                    setMessage(`پرداخت ناموفق بود. خطا: ${data.message || data.error}`);
                }
            } catch (err) {
                setStatus('error');
                setMessage('خطا در برقراری ارتباط با سرور برای تایید پرداخت.');
            }
        };

        if (orderId && authority && paymentStatus) {
            verifyPayment();
        } else {
            setStatus('error');
            setMessage('اطلاعات بازگشتی از درگاه پرداخت ناقص است.');
        }

    }, [searchParams]);

    return (
        <div className="container mx-auto text-center py-20">
            {status === 'loading' && <p className="text-xl animate-pulse">{message}</p>}
            {status === 'success' && <p className="text-2xl text-green-600 font-bold">{message}</p>}
            {status === 'error' && <p className="text-2xl text-red-600 font-bold">{message}</p>}
            <a href="/" className="btn btn-primary mt-8">بازگشت به صفحه اصلی</a>
        </div>
    );
}
