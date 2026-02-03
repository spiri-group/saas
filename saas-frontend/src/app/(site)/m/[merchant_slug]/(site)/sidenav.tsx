'use client'

import React, { useRef, useCallback } from "react";
import { addClassName, isNullOrWhitespace, omit } from "@/lib/functions";
import UseVendorInformation from "../../_components/Nametag/hooks/UseVendorInformation";
import { Panel } from "@/components/ux/Panel";
import { Button } from "@/components/ui/button";
import UseVendorTeamMembers from "../../_components/Profile/Edit/_hooks/UseVendorTeamMembers";
import VendorLogo from "../../_components/Profile/UI/Logo";
import LatestVideo from "../../_components/Profile/UI/LatestVideo";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import UseRemoveWelcomeMessage from "../../_components/Profile/_hooks/UseRemoveWelcomeMessage";
import { useProfileVisibility, useUpdateProfileVisibility } from "../../_components/Profile/_hooks/UseProfileVisibility";
import { useCustomerViewMode } from "../../_hooks/UseCustomerViewMode";
import useMerchantTheme from "../../_hooks/UseMerchantTheme";
import MerchantFontLoader from "../../_components/MerchantFontLoader";
import { cn } from "@/lib/utils";
import ExpandableArea from "@/components/ux/ExpandableArea";
import MerchantRequestForm from "../../_components/Profile/UI/MerchantRequestForm";
import MerchantCard from "../../_components/Profile/UI/MerchantCard";
import welcomeMessage from "@/cms/merchantWelcome.json";
import { FloatingContactButton, FloatingLocationButton } from "../../_components/Profile/UI/FloatingContactButtons";
import { useFollowerCount } from "../../_hooks/UseFollow";
import FollowButton from "../../_components/Profile/UI/FollowButton";

interface MerchantSidebarLayoutProps {
  children: React.ReactNode;
  merchantId: string;
  user?: {id: string};
}

export default function MerchantSidebarLayout({ children, merchantId, user }: MerchantSidebarLayoutProps) {
  const vendorInfo = UseVendorInformation(merchantId);
  const teamMembers = UseVendorTeamMembers(merchantId);
  const clearWelcomeMessage = UseRemoveWelcomeMessage();
  const vendorBranding = useMerchantTheme(merchantId);
  const profileVisibility = useProfileVisibility(merchantId);
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
        merchantId: merchantId,
        visibility: {
          ...currentVisibility,
          [section]: !currentIsVisible
        }
      });
    };
  }, [profileVisibility.data, updateVisibility, merchantId]);

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
             dangerouslySetInnerHTML={{ __html: intro_html }} />
        </ExpandableArea>
      </div>
    )
  }

  const VendorIntroCompact : React.FC = () => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const { data: followerCount } = useFollowerCount(merchantId);

    const formatCount = (count: number): string => {
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
      return count.toString();
    };

    const hasIntro = !isNullOrWhitespace(vendorInfo.data.intro);
    const intro_html = hasIntro ? addClassName("a", "text-merchant-links hover:underline", vendorInfo.data.intro) : "";

    return (
      <div className="flex flex-col">
        {hasIntro && (
          <p className={cn("text-sm leading-5", isExpanded ? "" : "line-clamp-1")}>
            <span dangerouslySetInnerHTML={{ __html: intro_html }} />
          </p>
        )}
        <div className={cn("flex items-center", hasIntro ? "justify-between mt-1" : "justify-end")}>
          {hasIntro && (
            <button
              className="text-merchant-links text-xs hover:underline"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Show less" : "Read more"}
            </button>
          )}
          {followerCount !== undefined && (
            <span className="text-xs text-merchant-default-foreground/60">
              {formatCount(followerCount)} {followerCount === 1 ? 'follower' : 'followers'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn("flex flex-col min-h-screen-minus-nav")}
      style={{
        background: 'rgb(var(--merchant-background, 248, 250, 252))',
        backgroundImage: 'var(--merchant-background-image, linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0))',
        backgroundSize: 'cover',
        backgroundAttachment: 'fixed'
      }}
    >
      <MerchantFontLoader fonts={fontConfig} />
      <div className="md:flex-grow flex flex-col md:flex-row">
        {/* Sidebar - Fixed Position */}
        <div className={cn(
          "hidden md:flex fixed top-[var(--nav-height,64px)] h-[calc(100vh-var(--nav-height,64px))] flex-col flex-none md:w-[350px] overflow-hidden transition-all duration-300",
          effectiveIsOwner ? "left-[210px]" : "left-0"
        )}>
          <div className="flex-none px-3 pt-6">
            <VendorLogo vendor={vendorData} />
          </div>
          <Panel className={cn("block md:hidden")}>
            <VendorIntro className="flex-grow" />
          </Panel>
          <div className={cn("hidden md:flex flex-col flex-grow overflow-y-auto space-y-4 text-merchant-panel-primary-foreground ml-3 px-3 py-4")}>
            <MerchantCard vendor={vendorData}>
              <div className="flex flex-col space-y-2">
                <VendorIntroCompact />
                <div className="flex flex-row items-center space-x-2">
                  {!effectiveIsOwner && (
                    <FollowButton
                      merchantId={merchantId}
                      variant="icon-only"
                    />
                  )}
                  <MerchantRequestForm
                    merchantId={merchantId}
                    user={user} />
                </div>
              </div>
            </MerchantCard>
            <div className="flex-grow flex flex-col space-y-6">
              <LatestVideo vendor={vendorData} visibility={createVisibilityProps('contactInformation')} />
            </div>
          </div>
        </div>
          
        {/* Floating Action Buttons - Fixed Position */}
        <div className={cn(
          "hidden md:flex fixed bottom-8 flex-col space-y-3 z-50 transition-all duration-300",
          effectiveIsOwner ? "left-[214px]" : "left-4"
        )}>
          <FloatingContactButton 
            vendor={vendorData} 
            visibility={createVisibilityProps('contactInformation')} 
          />
          <FloatingLocationButton 
            vendor={vendorData} 
            visibility={createVisibilityProps('locations')} 
          />
        </div>

        {/* Main Content - With left margin to account for fixed sidebar */}
        <div className="flex md:flex-grow flex-col space-y-2 md:ml-[370px]">
          {children}
        </div>
      </div>

      {/* Mobile sections */}
      <div className="grid md:hidden grid-rows-auto grid-cols-1 gap-3">
        <LatestVideo vendor={vendorInfo.data} visibility={createVisibilityProps('contactInformation')} />
      </div>

      {/* Welcome dialog */}
      { vendorInfo.data.onStart == "welcome" && (
        <Dialog open={vendorInfo.data.onStart == "welcome"}>
          <DialogContent>
            <h2 className="text-xl font-bold">{welcomeMessage.title}</h2>
            <p className="text-sm">{welcomeMessage.description}</p>
            <DialogFooter>
              <Button variant="default" type="button" className="w-full"
                onClick={() => {
                  clearWelcomeMessage.mutation.mutate(merchantId);

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