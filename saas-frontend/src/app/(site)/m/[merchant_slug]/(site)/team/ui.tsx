'use client';

import React from "react";
import UseVendorTeamMembers from "../../../_components/Profile/Edit/_hooks/UseVendorTeamMembers";
import UseVendorInformation from "../../../_components/Nametag/hooks/UseVendorInformation";
import useMerchantTheme from "../../../_hooks/UseMerchantTheme";
import { omit } from "@/lib/functions";
import { teamMember_type } from "@/utils/spiriverse";
import Image from "next/image";
import { cn } from "@/lib/utils";
import MerchantAccentText from "../../../_components/MerchantAccentText";

type Props = {
    merchantId: string;
}

const TeamPageUI: React.FC<Props> = ({ merchantId }) => {
    const teamMembers = UseVendorTeamMembers(merchantId);
    const vendorInfo = UseVendorInformation(merchantId);
    const vendorBranding = useMerchantTheme(merchantId);

    if (teamMembers.isLoading || vendorInfo.isLoading || vendorBranding.isLoading) {
        return <div className="p-8">Loading...</div>;
    }

    if (!teamMembers.data || teamMembers.data.length === 0) {
        return (
            <div className="p-8 text-center">
                <p className="text-merchant-default-foreground">No team members to display.</p>
            </div>
        );
    }

    if (!vendorInfo.data || !vendorBranding.data) {
        return <div className="p-8">Loading merchant information...</div>;
    }

    // Combine vendor data with branding
    const social = {
        ...omit(vendorInfo.data.social, ['style']),
        style: vendorBranding.data.vendor.social?.style || 'solid'
    }

    const vendorData = {
        ...vendorInfo.data,
        ...vendorBranding.data.vendor,
        social
    }

    return (
        <div className="p-8 bg-merchant-background">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 font-merchant-headings text-merchant-headings-foreground">
                    Meet Our Team
                </h1>
                <p className="text-merchant-default-foreground mb-8">
                    Get to know the amazing people behind {vendorData.name}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teamMembers.data.map((member: teamMember_type) => (
                        <div
                            key={member.id}
                            className={cn(
                                "rounded-xl p-6 transition-all duration-200 backdrop-blur-sm",
                                "hover:scale-105"
                            )}
                            style={{
                                backgroundColor: `rgba(var(--merchant-panel), var(--merchant-panel-transparency))`,
                                boxShadow: `0 10px 30px -5px rgba(var(--merchant-primary), 0.3), 0 4px 6px -2px rgba(var(--merchant-primary), 0.2)`
                            }}
                        >
                            <div className="flex flex-col items-center space-y-4">
                                {/* Profile Image */}
                                {member.image ? (
                                    <div className="relative w-32 h-32 rounded-full overflow-hidden">
                                        <Image
                                            src={member.image.url}
                                            alt={member.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="relative flex w-32 h-32 rounded-full text-2xl overflow-hidden bg-merchant-primary text-merchant-primary-foreground items-center justify-center">
                                        <span>
                                            {member.name
                                                .split(" ")
                                                .map(word => word.charAt(0).toUpperCase())
                                                .join("")}
                                        </span>
                                    </div>
                                )}

                                {/* Name */}
                                <MerchantAccentText className="text-xl font-semibold text-center">
                                    {member.name}
                                </MerchantAccentText>

                                {/* Tagline */}
                                {member.tagline && (
                                    <div className="text-sm text-center px-4 py-2 rounded-lg font-merchant-default text-merchant-primary bg-merchant-primary/10">
                                        {member.tagline}
                                    </div>
                                )}

                                {/* Bio */}
                                {member.bio && (
                                    <div 
                                        className="text-sm text-merchant-default-foreground text-center line-clamp-4 mt-2"
                                        dangerouslySetInnerHTML={{ __html: member.bio }}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TeamPageUI;
