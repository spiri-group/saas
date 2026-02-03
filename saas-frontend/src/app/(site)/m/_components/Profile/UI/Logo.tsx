'use client';

import React from "react";
import { vendor_type } from "@/utils/spiriverse";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import MerchantCard from "./MerchantCard";
import { MerchantBusinessName } from "../../MerchantAccentText";
import { iconsMapping } from "@/icons/social";
import Link from "next/link";

type Props = {
    vendor: vendor_type
}

const VendorLogo : React.FC<Props> = ({vendor}) => {
    const SocialIcons = () => {
        if (!vendor.social || vendor.social.platforms.length === 0) return null;
        
        return (
            <ul className="flex flex-row flex-wrap justify-center mt-2">
                {vendor.social.platforms.map((social, index) => (
                    <li key={index} className="mr-1">
                        <Link href={social.url} target="_blank" className="hover:opacity-80 transition-opacity">
                            {vendor.social.style === 'solid' ? (
                                <div 
                                    className="p-1 rounded flex items-center justify-center"
                                    style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                                    }}
                                >
                                    {iconsMapping[social.platform](vendor.social.style)}
                                </div>
                            ) : (
                                <div className="p-1">
                                    {iconsMapping[social.platform](vendor.social.style)}
                                </div>
                            )}
                        </Link>
                    </li>
                ))}
            </ul>
        );
    };

    if (vendor.logo == null || vendor.logo.url == null) {
        return  (
            <MerchantCard vendor={vendor} className="ml-6 mr-4"
            >
                <div className="flex flex-col space-y-2">
                    <div className="flex flex-row space-x-3 items-center">
                        <Avatar
                            className={
                                cn(
                                "flex items-center justify-center font-merchant-brand",
                                vendor.colors != null && vendor.colors.primary != null ? `bg-merchant-primary text-merchant-primary-foreground`: 'bg-primary text-foreground',
                                )
                            }
                        >{vendor.name.split(' ').map(word => word[0]).join('')}</Avatar>
                        <MerchantBusinessName className="flex-grow">
                            {vendor.name}
                        </MerchantBusinessName>
                    </div>
                    <SocialIcons />
                </div>
            </MerchantCard>
        )
    }

    return (
        <MerchantCard 
            vendor={vendor} 
            className="relative space-y-2 ml-3 overflow-hidden"
            style={{ padding: 0 }}
        >
            <div className="h-36">
                <img style={{objectFit: "contain", objectPosition: "center", width: "100%", height: "100%"}} 
                    src={vendor.logo.url} 
                    alt="logo" />
            </div>
            <div className="px-4 pb-4">
                <SocialIcons />
            </div>
        </MerchantCard>
    )
}

export default VendorLogo