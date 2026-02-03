'use client'

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import FollowButton from "../../_components/Profile/UI/FollowButton";
import UseMerchantIdFromSlug from "../../_hooks/UseMerchantIdFromSlug";
import UseVendorInformation from "../../_components/Nametag/hooks/UseVendorInformation";
import { useCustomerViewMode } from "../../_hooks/UseCustomerViewMode";

interface MerchantTopBarLayoutProps {
  children: React.ReactNode;
}

export default function MerchantTopBarLayout({ children }: MerchantTopBarLayoutProps) {
  const params = useParams();
  const pathname = usePathname();
  const merchantSlug = params.merchant_slug as string;

  // Get merchantId from slug for follow button
  const { data: merchantData } = UseMerchantIdFromSlug(merchantSlug);
  const merchantId = merchantData?.merchantId;

  // Check if user is the owner
  const vendorInfo = UseVendorInformation(merchantId || '');
  const isVendorOwner = vendorInfo.data?.hasRole ?? false;
  const isCustomerViewMode = useCustomerViewMode();
  const effectiveIsOwner = isVendorOwner && !isCustomerViewMode;

  // Determine active path
  const basePath = `/m/${merchantSlug}`;
  const isCatalogueActive = pathname === basePath || pathname === `${basePath}/`;
  const isGalleryActive = pathname.startsWith(`${basePath}/gallery`);
  const isExploreActive = pathname.startsWith(`${basePath}/explore`);
  const isTeamActive = pathname.startsWith(`${basePath}/team`);

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar - Sticky */}
      <div
        className="sticky top-[var(--nav-height,64px)] z-40 flex flex-row justify-between items-center px-6 py-4 border-b backdrop-blur-sm"
        style={{
          backgroundColor: 'rgba(var(--merchant-panel, 255, 255, 255), var(--merchant-panel-transparency, 0.9))',
          borderColor: 'rgba(var(--merchant-primary, 156, 163, 175), 0.2)'
        }}
      >
        <nav className="flex space-x-8">
          <Link
            href={`/m/${merchantSlug}/`}
            className={cn(
              "font-medium transition-colors",
              isCatalogueActive
                ? "text-merchant-primary border-b-2 border-merchant-primary pb-1"
                : "text-merchant-default-foreground hover:text-merchant-primary"
            )}
          >
            Catalogue
          </Link>
          <Link
            href={`/m/${merchantSlug}/explore`}
            className={cn(
              "font-medium transition-colors",
              isExploreActive
                ? "text-merchant-primary border-b-2 border-merchant-primary pb-1"
                : "text-merchant-default-foreground hover:text-merchant-primary"
            )}
          >
            Explore
          </Link>
          <Link
            href={`/m/${merchantSlug}/gallery`}
            className={cn(
              "font-medium transition-colors",
              isGalleryActive
                ? "text-merchant-primary border-b-2 border-merchant-primary pb-1"
                : "text-merchant-default-foreground hover:text-merchant-primary"
            )}
          >
            Gallery
          </Link>
          <Link
            href={`/m/${merchantSlug}/team`}
            className={cn(
              "font-medium transition-colors",
              isTeamActive
                ? "text-merchant-primary border-b-2 border-merchant-primary pb-1"
                : "text-merchant-default-foreground hover:text-merchant-primary"
            )}
          >
            Team
          </Link>
        </nav>
        <div className="flex items-center">
          {!effectiveIsOwner && merchantId && (
            <FollowButton
              merchantId={merchantId}
              variant="compact"
              showCount={true}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow">
        {children}
      </div>
    </div>
  );
}