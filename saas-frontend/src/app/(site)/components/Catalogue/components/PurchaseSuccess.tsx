'use client';

import { Button } from "@/components/ui/button";
import { DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";

const PurchaseSuccess = () => {
    const pathName = usePathname();
    const router = useRouter();
    const { data: session } = useSession();
    const user = session?.user;

    const handleContinueShopping = () => {
        const params = new URLSearchParams(window.location.search);
        params.delete("setup_intent");
        params.delete("setup_intent_client_secret");
        params.delete("redirect_status");
        const newUrl = `${pathName}?${params.toString()}`;
        router.replace(newUrl);
    };

    const handleGoToOrders = () => {
        if (user?.id) {
            router.push(`/u/${user.id}/space/orders`);
        } else {
            router.push('/orders'); // fallback for logged out users
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <h1>Payment successful</h1>    
            </DialogHeader>
            <p>Your purchase is complete. Thank you for shopping with us. Please find the confirmation in your orders</p>
            <DialogFooter className="flex flex-row space-x-3">
                <Button variant={"destructive"} className="flex-grow" onClick={handleContinueShopping}>Continue Shopping</Button>
                <Button className="flex-grow" onClick={handleGoToOrders}>Go to orders</Button>
            </DialogFooter>
        </DialogContent>
    )
}

export default PurchaseSuccess;