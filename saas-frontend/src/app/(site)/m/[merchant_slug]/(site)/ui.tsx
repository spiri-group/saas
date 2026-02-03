'use client';

import RollingBanner from "@/components/ux/RollingBanner";
import CatalogueBanner from "./components/PromiseBanner";
import UseVendorInformation from "../../_components/Nametag/hooks/UseVendorInformation";
import useMerchantTheme from "../../_hooks/UseMerchantTheme";
import MerchantCatalogue from "./components/MerchantCatalogue";

function VendorPageContent({ session, merchantId }: { session: any, merchantId: string }) {
    const vendorInfo = UseVendorInformation(merchantId);
    const vendorBranding = useMerchantTheme(merchantId);

    if (vendorInfo.data == null || vendorBranding.data == null) return <></>;

    return (
        <>
            {/* Show catalogue banner if configured, otherwise show regular banner */}
            {vendorInfo.data.bannerConfig ? (
                <CatalogueBanner 
                    config={vendorInfo.data.bannerConfig} 
                    className="hidden md:block mb-2" 
                />
            ) : vendorInfo.data.banner != null ? (
                <RollingBanner images={[
                    {
                        image: vendorInfo.data.banner.url,
                        alt: "Primary banner"
                    }
                ]} className="hidden md:block" />
            ) : null}
            
            <MerchantCatalogue
                session={session}
                className="md:flex-grow mt-1 mr-2"
                merchantId={merchantId}
                merchantBranding={vendorBranding.data.vendor} />
        </>
    );
}

export default VendorPageContent;