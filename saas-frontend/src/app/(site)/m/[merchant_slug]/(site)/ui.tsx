'use client';

import RollingBanner from "@/components/ux/RollingBanner";
import CatalogueBanner from "./components/PromiseBanner";
import UseVendorInformation from "../../_components/Nametag/hooks/UseVendorInformation";
import useMerchantTheme from "../../_hooks/UseMerchantTheme";
import MerchantCatalogue from "./components/MerchantCatalogue";
import Image from "next/image";

function ComingSoonPage({ name, logoUrl }: { name: string; logoUrl?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4" data-testid="coming-soon-page">
            {logoUrl && (
                <div className="mb-6">
                    <Image
                        src={logoUrl}
                        alt={`${name} logo`}
                        width={120}
                        height={120}
                        className="rounded-full object-cover"
                        data-testid="coming-soon-logo"
                    />
                </div>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3" data-testid="coming-soon-name">
                {name}
            </h1>
            <p className="text-slate-400 text-lg" data-testid="coming-soon-message">
                Coming Soon
            </p>
        </div>
    );
}

function VendorPageContent({ session, merchantId }: { session: any, merchantId: string }) {
    const vendorInfo = UseVendorInformation(merchantId);
    const vendorBranding = useMerchantTheme(merchantId);

    if (vendorInfo.data == null || vendorBranding.data == null) return <></>;

    // Show Coming Soon page for unpublished vendors (unless the viewer is an admin)
    if (!vendorInfo.data.publishedAt && !vendorInfo.data.hasRole) {
        return (
            <ComingSoonPage
                name={vendorInfo.data.name}
                logoUrl={vendorInfo.data.logo?.url}
            />
        );
    }

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
