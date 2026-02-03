'use client';

import UseVendorInformation from "@/app/(site)/m/_components/Nametag/hooks/UseVendorInformation";
import useMerchantTheme from "@/app/(site)/m/_hooks/UseMerchantTheme";
import MerchantFontLoader from "@/app/(site)/m/_components/MerchantFontLoader";
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from "@/components/ux/Carousel";
import { addClassName } from "@/lib/functions";
import Image from "next/image";
import MerchantCard from "@/app/(site)/m/_components/Profile/UI/MerchantCard";
import Locations from "@/app/(site)/m/_components/Profile/UI/Locations";

export default function ExplorePageContent({ merchantId }: { merchantId: string }) {
    const vendorInfo = UseVendorInformation(merchantId);
    const vendorBranding = useMerchantTheme(merchantId);

    if (!vendorInfo.data || !vendorBranding.data) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    const vendor = {
        ...vendorInfo.data,
        ...vendorBranding.data.vendor
    };

    // Prepare font configuration
    const fontConfig = vendorBranding.data.vendor.font ? {
        brand: vendorBranding.data.vendor.font.brand?.family || 'clean',
        default: vendorBranding.data.vendor.font.default?.family || 'clean',
        headings: vendorBranding.data.vendor.font.headings?.family || 'clean',
        accent: vendorBranding.data.vendor.font.accent?.family || 'clean'
    } : undefined;

    const hasDescriptions = vendor.descriptions && vendor.descriptions.length > 0;
    const hasLocations = vendor.locations && vendor.locations.length > 0;

    if (!hasDescriptions && !hasLocations) {
        return (
            <div className="p-4">
                <MerchantFontLoader fonts={fontConfig} />
                <div className="max-w-5xl mx-auto text-center py-16">
                    <h2 className="text-2xl font-bold text-merchant-headings-foreground mb-4">
                        No Explore Content Yet
                    </h2>
                    <p className="text-merchant-default-foreground/70">
                        Check back soon for more about our story and what makes us unique!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <MerchantFontLoader fonts={fontConfig} />
            <div className="w-full space-y-6">
                <p className="text-merchant-default-foreground">
                    Learn more about our story, values, and what makes us unique.
                </p>

                {/* Locations Section */}
                {hasLocations && (
                    <div className="mb-8">
                        <Locations vendor={vendor} />
                    </div>
                )}

                {/* Descriptions Section */}
                {hasDescriptions && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 has-[:hover]:*:grayscale has-[:hover]:*:opacity-40">
                        {vendor.descriptions.map((section) => {
                            const html_string = addClassName("a", "text-merchant-links hover:underline", section.body);
                            return (
                                <MerchantCard
                                    key={section.id}
                                    vendor={vendor}
                                    className="group transition-all duration-300 ease-out backdrop-blur-sm hover:!grayscale-0 hover:!opacity-100 hover:-translate-y-2 cursor-pointer"
                                    expandable={false}
                                    title={section.title}
                                >
                                    <Carousel>
                                        <CarouselContent>
                                            {section.supporting_images
                                                .filter(image => image.title != null && image.url != null)
                                                .map((image, idx) => (
                                                    <CarouselItem key={idx} className="relative w-full aspect-video">
                                                        <Image
                                                            src={image.url as string}
                                                            alt={image.title as string}
                                                            className="rounded-t-xl"
                                                            fill={true}
                                                            style={{ objectFit: "cover" }} />
                                                    </CarouselItem>
                                                ))
                                            }
                                        </CarouselContent>
                                        {section.supporting_images.length > 1 && <CarouselDots className="mt-2" />}
                                    </Carousel>
                                    <p className="leading-6 px-2 pt-2 text-merchant-default-foreground" dangerouslySetInnerHTML={{ __html: html_string }} />
                                </MerchantCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
