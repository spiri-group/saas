'use client'

import { Button } from "@/components/ui/button";
import { EyeIcon, ArrowLeftIcon } from "lucide-react";
import { Session } from "next-auth";
import { useRouter, usePathname } from "next/navigation";
import HasMerchantAccess from "../_hooks/HasMerchantAccess";
import { useCustomerViewMode } from "../_hooks/UseCustomerViewMode";

type Props = {
    session: Session | null,
    merchantId: string
}

const ViewModeToggle: React.FC<Props> = ({ session, merchantId }) => {
    const router = useRouter();
    const pathname = usePathname();
    const isCustomerViewMode = useCustomerViewMode();
    
    // Check if user has merchant access
    const merchantAccessGranted = session ? HasMerchantAccess(session, { merchantId }) : false;
    
    // Only show on profile page (main merchant page) and gallery page
    const isProfilePage = pathname.match(/^\/m\/[^\/]+\/?$/); // /m/[merchant_slug] or /m/[merchant_slug]/
    const isGalleryPage = pathname.includes('/gallery');
    
    // Don't show toggle if user doesn't have merchant access or not on allowed pages
    if (!merchantAccessGranted || (!isProfilePage && !isGalleryPage)) {
        return null;
    }
    
    const toggleViewMode = () => {
        const currentUrl = new URL(window.location.href);
        
        if (isCustomerViewMode) {
            // Switch back to merchant view
            currentUrl.searchParams.delete('viewMode');
        } else {
            // Switch to customer view
            currentUrl.searchParams.set('viewMode', 'customer');
        }
        
        router.push(currentUrl.toString());
    };
    
    return (
        <div className="fixed top-24 right-4 z-50">
            <Button
                onClick={toggleViewMode}
                variant={isCustomerViewMode ? "default" : "outline"}
                size="sm"
                className="shadow-lg"
            >
                {isCustomerViewMode ? (
                    <>
                        <ArrowLeftIcon className="h-4 w-4 mr-2" />
                        Back to Merchant View
                    </>
                ) : (
                    <>
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View as Customer
                    </>
                )}
            </Button>
        </div>
    );
};

export default ViewModeToggle;