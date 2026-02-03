'use client'

import React, { useRef, useCallback } from "react";
import { addClassName, isNullOrWhitespace, omit } from "@/lib/functions";
import UseVendorInformation from "../Nametag/hooks/UseVendorInformation";
import RollingBanner from "@/components/ux/RollingBanner";
import CatalogueBanner from "../../[merchant_slug]/(site)/components/PromiseBanner";
import { Panel } from "@/components/ux/Panel";
import { Button } from "@/components/ui/button";
import UseVendorTeamMembers from "./Edit/_hooks/UseVendorTeamMembers";
import VendorLogo from "./UI/Logo";
import Contact from "./UI/Contact";
import Locations from "./UI/Locations";
import LatestVideo from "./UI/LatestVideo";
import { VendorTeamMembersUI } from "./UI/VendorTeamMembers";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import UseRemoveWelcomeMessage from "./_hooks/UseRemoveWelcomeMessage";
import { useProfileVisibility, useUpdateProfileVisibility } from "./_hooks/UseProfileVisibility";
import { useCustomerViewMode } from "../../_hooks/UseCustomerViewMode";

import welcomeMessage from "@/cms/merchantWelcome.json"
import useMerchantTheme from "../../_hooks/UseMerchantTheme";
import MerchantFontLoader from "../MerchantFontLoader";
import { cn } from "@/lib/utils";
import ExpandableArea from "@/components/ux/ExpandableArea";
import MerchantRequestForm from "./UI/MerchantRequestForm";
import { Session } from "next-auth";
import MerchantCard from "./UI/MerchantCard";
import MerchantCatalogue from "../../[merchant_slug]/(site)/components/MerchantCatalogue";

type Props = {
    session: Session | null,
    merchantId: string,
    withTeamMembers?: boolean,
    user?: {id: string}
}

const VendorProfile : React.FC<Props> = (props) => {

    const vendorInfo = UseVendorInformation(props.merchantId as string);
    const teamMembers = UseVendorTeamMembers(props.merchantId as string);
    const clearWelcomeMessage = UseRemoveWelcomeMessage();
    const vendorBranding = useMerchantTheme(props.merchantId as string);
    const profileVisibility = useProfileVisibility(props.merchantId as string);
    const updateVisibility = useUpdateProfileVisibility();
    const isCustomerViewMode = useCustomerViewMode();

    // Determine if current user has ADMIN role for this vendor
    const isVendorOwner = vendorInfo.data?.hasRole ?? false;
    
    // In customer view mode, treat user as non-owner regardless of actual permissions
    const effectiveIsOwner = isVendorOwner && !isCustomerViewMode;

    // Create memoized toggle functions for each section
    const createToggle = useCallback((section: 'contactInformation' | 'locations' | 'teamMembers' | 'sections') => {
        return () => {
            // Default to all true if no data exists yet
            const currentVisibility = profileVisibility.data ?? {
                contactInformation: true,
                locations: true, 
                teamMembers: true,
                sections: true
            };
            const currentIsVisible = currentVisibility[section] ?? true;
            
            updateVisibility.mutate({
                merchantId: props.merchantId,
                visibility: {
                    ...currentVisibility,
                    [section]: !currentIsVisible
                }
            });
        };
    }, [profileVisibility.data, updateVisibility, props.merchantId]);

    // Create visibility helpers for each section
    const createVisibilityProps = useCallback((section: 'contactInformation' | 'locations' | 'teamMembers' | 'sections') => {
        // Always get visibility state (for both owners and customers)
        const isVisible = profileVisibility.data?.[section] ?? true;
        
        // Return null for customers when section is not visible (hide completely)
        if (!effectiveIsOwner && !isVisible) {
            return null;
        }
        
        // Return undefined for customers when section is visible (no visibility controls)
        if (!effectiveIsOwner) {
            return undefined;
        }
        
        // For owners, return full visibility props with toggle functionality
        const toggle = createToggle(section);
        
        return {
            isVisible,
            toggle,
            isPending: updateVisibility.isPending
        };
    }, [effectiveIsOwner, profileVisibility.data, createToggle, updateVisibility.isPending]);

    if (vendorInfo.data == null || teamMembers.data == null || vendorBranding.data == null) return (<></>);

    // now we combine vendorInfo and vendorBranding to get the final vendor data
    const social = {
        ...omit(vendorInfo.data.social, ['style']),
        style: vendorBranding.data.vendor.social?.style || 'solid'
    }
    
    const vendorData = {
        ...vendorInfo.data,
        ...vendorBranding.data.vendor,
        social
    }

    // Prepare font configuration for the new font loader
    const fontConfig = vendorBranding.data.vendor.font ? {
        brand: vendorBranding.data.vendor.font.brand?.family || 'clean',
        default: vendorBranding.data.vendor.font.default?.family || 'clean',
        headings: vendorBranding.data.vendor.font.headings?.family || 'clean',
        accent: vendorBranding.data.vendor.font.accent?.family || 'clean'
    } : undefined;


    const VendorIntro : React.FC<{className?: string}> = ({ className }) => {

        const vendorIntroContentRef = useRef<HTMLParagraphElement>(null);

        if (isNullOrWhitespace(vendorInfo.data.intro)) return <></>;

        const intro_html = addClassName("a", "text-merchant-links hover:underline", vendorInfo.data.intro);

        return (
            <div className={cn("flex flex-col", className)}>
                <ExpandableArea
                    readMoreButtonProps={{
                        className: "text-merchant-links"
                    }}
                    heightPercent={10}>
                    <p ref={vendorIntroContentRef}
                   className={cn("leading-6 text-sm truncate")}
                   data-testid="merchant-intro-text"
                   dangerouslySetInnerHTML={{ __html: intro_html }} />
                </ExpandableArea>
            </div>
        )
    }

    return (
        <div className={cn("flex flex-col min-h-screen-minus-nav")}>
            <MerchantFontLoader fonts={fontConfig} />
            <div className="md:flex-grow flex flex-col md:flex-row md:space-x-3 my-2 mr-2">
                <div className="hidden md:flex flex-col flex-none md:w-[350px] h-auto space-y-6">
                    <VendorLogo vendor={vendorData} />
                    <Panel className={cn("block md:hidden")}>
                        <VendorIntro className="flex-grow" />
                    </Panel>
                    <div className={cn("hidden md:flex flex-col flex-grow overflow-y-auto md:h-full space-y-6 text-merchant-panel-primary-foreground ml-3 px-3")}>
                        <MerchantCard
                            vendor={vendorData}
                            >
                            <VendorIntro className="pt-2 mb-2" />
                            <MerchantRequestForm 
                                merchantId={props.merchantId} 
                                user={props.user} />
                        </MerchantCard>
                        <div className="flex-grow flex flex-col space-y-6">
                            <LatestVideo vendor={vendorData} />
                            <Contact vendor={vendorData} visibility={createVisibilityProps('contactInformation')} />
                            <Locations vendor={vendorData} visibility={createVisibilityProps('locations')} />
                            <VendorTeamMembersUI vendor={vendorData} data={teamMembers.data} visibility={createVisibilityProps('teamMembers')} />
                        </div>
                    </div>
                </div>
                <div className="flex md:flex-grow flex-col space-y-2 md:space-x-2 ml-2 md:ml-0">
                    {/* Show catalogue banner if configured, otherwise show regular banner */}
                    {vendorInfo.data.bannerConfig ? (
                        <CatalogueBanner 
                            config={vendorInfo.data.bannerConfig} 
                            className="hidden md:block" 
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
                        session={props.session}
                        className="md:flex-grow mt-1 mr-2"
                        merchantId={props.merchantId}
                        merchantBranding={vendorBranding.data.vendor} />
                </div>
            </div>
            <div className="grid md:hidden grid-rows-auto grid-cols-1 gap-3 mx-2">
                <LatestVideo vendor={vendorInfo.data} />
                <Contact vendor={vendorInfo.data} visibility={createVisibilityProps('contactInformation')} />
                <Locations vendor={vendorInfo.data} visibility={createVisibilityProps('locations')} />
                <VendorTeamMembersUI vendor={vendorInfo.data} data={teamMembers.data} visibility={createVisibilityProps('teamMembers')} />
            </div>
            { vendorInfo.data.onStart == "welcome" && (
                <Dialog open={vendorInfo.data.onStart == "welcome"}>
                    <DialogContent>
                        <h2 className="text-xl font-bold">{welcomeMessage.title}</h2>
                        <p className="text-sm">{welcomeMessage.description}</p>
                        <DialogFooter>
                            <Button variant="default" type="button" className="w-full"
                                onClick={() => {
                                    clearWelcomeMessage.mutation.mutate(props.merchantId);

                                    setTimeout(() => {
                                        // we need to raise an event to open the nav on the customise path
                                        const event = new CustomEvent("open-nav-external", {
                                            detail: {
                                                path: ["Profile", "Customise"],
                                                action: {
                                                    type: "expand"
                                                }
                                            }
                                        });
                                        window.dispatchEvent(event);
                                    }, 3000)
                                }}
                            >Customise your profile</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

export default VendorProfile;