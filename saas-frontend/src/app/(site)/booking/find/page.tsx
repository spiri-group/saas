'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Ticket } from 'lucide-react';

export default function FindBookingPage() {
    const router = useRouter();
    const [bookingCode, setBookingCode] = useState('');
    const [merchantSlug, setMerchantSlug] = useState('');
    const [error, setError] = useState('');

    const handleSearch = () => {
        if (!bookingCode.trim()) {
            setError('Please enter your booking code');
            return;
        }
        if (!merchantSlug.trim()) {
            setError('Please enter the business name or URL');
            return;
        }
        setError('');
        // The merchant slug might be a full URL or just the slug
        const slug = merchantSlug.replace(/.*spiriverse\.com\/m\//, '').replace(/\/.*/, '').trim();
        router.push(`/booking/${slug}/${bookingCode.trim()}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                        <Ticket className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Find Your Booking</CardTitle>
                    <CardDescription>
                        Enter your booking code and the business name to view your booking details
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Booking Code</label>
                        <Input
                            placeholder="e.g. 123456"
                            value={bookingCode}
                            onChange={(e) => setBookingCode(e.target.value)}
                            data-testid="find-booking-code-input"
                            className="text-center text-lg font-mono tracking-wider"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Business Name or URL</label>
                        <Input
                            placeholder="e.g. my-tour-company"
                            value={merchantSlug}
                            onChange={(e) => setMerchantSlug(e.target.value)}
                            data-testid="find-booking-merchant-input"
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            The business name from your confirmation email or the spiriverse.com URL
                        </p>
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSearch}
                        data-testid="find-booking-submit"
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Find Booking
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
