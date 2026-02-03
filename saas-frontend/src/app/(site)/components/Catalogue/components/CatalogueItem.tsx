'use client'

import { listing_sku_type, listing_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { forwardRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import { isNullOrWhitespace } from "@/lib/functions";
import { cn } from "@/lib/utils";
import * as NextImage from "next/image";
import CurrencySpan from "@/components/ux/CurrencySpan";
import IconButton from "@/components/ui/iconbutton";
import { PaintRollerIcon, MoreVertical, Edit, Trash, Eye, EyeOff, Loader2 } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Session } from "next-auth";
import HasMerchantAccess from "@/app/(site)/m/_hooks/HasMerchantAccess";
import { useCustomerViewMode } from "@/app/(site)/m/_hooks/UseCustomerViewMode";
import { useOnVendorPages } from "@/app/(site)/m/_hooks/UseOnVendorPages";

type Props = BLProps & {
    className?: string,
    openEditThumbnail?: () => void,
    onEditListing?: () => void,
    onDeleteListing?: () => void,
    onToggleLiveStatus?: (isLive: boolean) => void,
    isTogglingLive?: boolean,
}

type BLProps = {
    session: Session | null,
    listing: listing_type;
}

const useSelectedSku = (skus: listing_sku_type[]) => {
    const isSingleSku = skus.length === 1;
    const [value, select] = useState<listing_sku_type | null>(
      isSingleSku ? skus[0] : null
    );
  
    const reset = () => {
        select(isSingleSku ? skus[0] : null);
    };
  
    return { value, select, reset };
};

const useBL = (props: BLProps) => {
    
    const selectedSku = useSelectedSku(props.listing.skus);
    
    const schema = z.object({
        sku: z.object({
            id: z.string().min(1),
            price: CurrencyAmountSchema,
            qty: z.string().min(1),
        }),
        quantity: z.coerce.number().min(1),
    });

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: props.listing.skus.length == 1 ? {
            sku: props.listing.skus[0],
            quantity: 1
        } : {
            quantity: 1
        }
    });

    const reset = () => {
        
    }

    return {
        form,
        merchantAccessGranted: props.session != null && HasMerchantAccess(props.session, {
            merchantId: props.listing.vendor.id
        }),
        selectedSku: {
            get: selectedSku.value,
            set: selectedSku.select
        },
        selectedValues: form.getValues(),
        reset: () => {
            form.reset();
            selectedSku.reset();
        },
        save: async () => {
            reset();
        }
    }
}

const CatalogueItem = forwardRef<HTMLAnchorElement, Props>(({ className, ...props}, ref) => {
    const bl = useBL(props)
    const isCustomerViewMode = useCustomerViewMode()
    const isOnVendorPages = useOnVendorPages()

    const thumbnail = props.listing.thumbnail

    // Safety check: if thumbnail or image is missing, don't render
    if (!thumbnail || !thumbnail.image || !thumbnail.image.media) {
        return null;
    }

    let catalogueItemSize = `col-span-1`
    let imageContainerClass = "h-60" // Default square-ish for products
    let urlRelative: string | undefined = undefined;
    if (props.listing.type == "TOUR") {
        urlRelative = `/m/${props.listing.vendor.slug}/tour/${props.listing.id}`
        catalogueItemSize = `col-span-2`
        imageContainerClass = "aspect-[2/1]" // Landscape for tours spanning 2 columns
    } else if (props.listing.type == "SERVICE") {
        urlRelative  = `/m/${props.listing.vendor.slug}/services/${props.listing.slug || props.listing.id}`
    } else if (props.listing.type == "PRODUCT") {
        urlRelative  = `/m/${props.listing.vendor.slug}/product/${props.listing.slug || props.listing.id}`
    }

    const rounded = "xl"

    // Check if thumbnail has panelTone set (indicating easy mode)
    const isEasyMode = thumbnail?.panelTone === "light" || thumbnail?.panelTone === "dark";
    const shouldUseMerchantTheming = isEasyMode && isOnVendorPages;

    // Get merchant theme information
    const merchantScheme = props.listing.vendor.selectedScheme as 'light' | 'dark' || 'light';
    const panelTone = (thumbnail?.panelTone as 'light' | 'dark') || 'light';

    type Scheme = "dark" | "light";
    type PanelTone = "dark" | "light";

    const getPanelStyles = (scheme: Scheme, panelTone: PanelTone): React.CSSProperties => {
        const isDarkPanel = panelTone === "dark";
        const isDarkScheme = scheme === "dark";

        // backgrounds (solid-ish + gradient "glass")
        const bgLightGlass =
            "linear-gradient(to bottom right, rgba(255,255,255,0.85), rgba(255,255,255,0.65))";
        const bgLightFlat = "rgba(255, 255, 255, 0.7)";

        const bgDarkGlass =
            "linear-gradient(to bottom right, rgba(15,23,42,0.94), rgba(15,23,42,0.84))"; // slate-900-ish
        const bgDarkFlat = "rgba(15, 23, 42, 0.9)";

        // choose glass in dark scheme (looks better), flat in light scheme (cleaner)
        const background =
            isDarkPanel
            ? (isDarkScheme ? bgDarkGlass : bgDarkFlat)
            : (isDarkScheme ? bgLightGlass : bgLightFlat);

        // text color per panel
        const color = isDarkPanel ? "#F8FAFC" /* slate-50 */ : "#0B1220" /* near-slate-950 */;

        // borders tuned to context
        const border = `1px solid ${
            isDarkPanel
            ? (isDarkScheme ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)")
            : (isDarkScheme ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.06)")
        }`;

        // elevation tuned to scheme
        const boxShadow = isDarkScheme
            ? "0 8px 24px rgba(0,0,0,0.35)"
            : "0 6px 20px rgba(2,6,23,0.15)";

        // subtle frosted feel; a bit stronger in dark scheme
        const backdropFilter = isDarkScheme ? "saturate(120%) blur(6px)" : "saturate(110%) blur(4px)";

        return { background, color, border, boxShadow, backdropFilter };
    }

    if (!isNullOrWhitespace(urlRelative)) {
        const lowest_price = props.listing.type === "PRODUCT" ? props.listing.skus.reduce((prev, curr) => {
            return prev.price < curr.price ? prev : curr
        }).price : undefined;

        return (
            <Link
                ref={ref}
                href={urlRelative as string}
                aria-label={`catalogue-item-${props.listing.id}`}
                className={cn("w-full flex flex-col h-full transition-all duration-300 ease-out",
                    // Only lift/scale if no dynamic mode
                    !thumbnail.dynamicMode && "hover:scale-105 hover:-translate-y-2",
                    // Light theme: crisp shadows, Dark theme: glow effects
                    shouldUseMerchantTheming && merchantScheme === 'light'
                        ? "shadow-md hover:shadow-lg border border-gray-200 hover:border-gray-300"
                        : "shadow-xl hover:shadow-2xl",
                    `rounded-${rounded}`,
                    catalogueItemSize,
                    className)}>
                <div
                    className={cn("relative w-full group overflow-hidden", `rounded-t-${rounded}`, imageContainerClass)}
                    style={{
                        background: thumbnail?.bgColor === "#ffffff" || !thumbnail?.bgColor
                            ? "linear-gradient(to bottom, #f8fafc, #f1f5f9, #e2e8f0)" // improved light theme gradient
                            : thumbnail?.bgColor === "#000000"
                            ? "linear-gradient(to bottom, #000000, #0f172a, #1e293b)" // dark theme gradient
                            : thumbnail?.bgColor // custom color
                    }}
                    onMouseEnter={(e) => {
                            const video = e.currentTarget.querySelector('video') as HTMLVideoElement | null;
                            if (video) {
                                video.loop = true;
                                video.currentTime = 0;
                                video.play().catch(() => {});
                            }
                    }}
                    onMouseLeave={(e) => {
                            const video = e.currentTarget.querySelector('video') as HTMLVideoElement | null;
                            if (video) {
                                video.pause();
                                video.currentTime = 0;
                            }
                    }}
                    >
                    {/* Image layer */}
                    <NextImage.default
                        src={thumbnail.image.media.url}
                        className={cn(
                            `rounded-t-${rounded} transition-all duration-300 ease-out`,
                            thumbnail.dynamicMode ? "group-hover:opacity-0" : "group-hover:scale-110"
                        )}
                        style={{ objectFit: thumbnail.image.objectFit || "cover", height: "100%", transform: `scale(${thumbnail.image.zoom || 1})` }}
                        fill={true}
                        alt={""}
                    />

                    {/* Video mode - play video on hover */}
                    {thumbnail.dynamicMode?.type === 'VIDEO' && thumbnail.dynamicMode?.video?.media && (
                        <video
                            src={thumbnail.dynamicMode.video.media.url}
                            className={cn(
                                `absolute inset-0 w-full h-full rounded-t-${rounded} opacity-0 group-hover:opacity-100 transition-opacity duration-300`
                            )}
                            style={{ objectFit: thumbnail.image.objectFit || "cover" }}
                            muted
                            loop
                            playsInline
                            preload="auto"
                        />
                    )}

                    {/* Collage mode - crossfade images on hover */}
                    {thumbnail.dynamicMode?.type === 'COLLAGE' && thumbnail.dynamicMode?.collage?.images && thumbnail.dynamicMode.collage.images.length > 0 && (
                        <div className={cn(
                            `absolute inset-0 w-full h-full rounded-t-${rounded} opacity-0 group-hover:opacity-100 transition-opacity duration-300`
                        )}>
                            {thumbnail.dynamicMode.collage.images.map((img, idx) => (
                                <NextImage.default
                                    key={idx}
                                    src={img.url}
                                    className={cn(
                                        `absolute inset-0 rounded-t-${rounded}`,
                                        "animate-fade-in-out"
                                    )}
                                    style={{
                                        objectFit: thumbnail.image.objectFit || "cover",
                                        animationDelay: `${idx * (thumbnail.dynamicMode?.collage?.transitionDuration || 3)}s`,
                                        animationDuration: `${(thumbnail.dynamicMode?.collage?.images?.length || 1) * (thumbnail.dynamicMode?.collage?.transitionDuration || 3)}s`
                                    }}
                                    fill={true}
                                    alt={""}
                                />
                            ))}
                        </div>
                    )}

                    {/* Stamp overlay */}
                    {thumbnail.stamp?.enabled && thumbnail.stamp?.text && (
                        <div
                            className="absolute top-2 left-2 z-10 px-2 py-1 text-xl font-bold rounded shadow-lg group-hover:opacity-0 transition-opacity duration-200"
                            style={{
                                zIndex: 10,
                                backgroundColor: thumbnail.stamp.bgColor || "#dc2626",
                                color: thumbnail.stamp.textColor || "#ffffff"
                            }}
                        >
                            {thumbnail.stamp.text}
                        </div>
                    )}
                    {/* Draft badge for merchant - only show when product is not live */}
                    {bl.merchantAccessGranted && !isCustomerViewMode && props.listing.type === 'PRODUCT' && props.listing.isLive === false && (
                        <div
                            className="absolute top-2 right-2 z-10 px-2 py-1 text-xs font-semibold rounded shadow-lg flex items-center gap-1"
                            style={{
                                zIndex: 10,
                                backgroundColor: "#f59e0b",
                                color: "#ffffff"
                            }}
                        >
                            <EyeOff size={12} />
                            Draft
                        </div>
                    )}
                    {
                        bl.merchantAccessGranted && !isCustomerViewMode && (props.openEditThumbnail || props.onEditListing || props.onDeleteListing) &&
                            (
                                <div className="absolute bottom-2 right-2 flex gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                            <IconButton
                                                aria-label="listing-actions"
                                                type="button"
                                                variant="default"
                                                icon={<MoreVertical size={16} />}
                                            />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            onClick={(e) => e.preventDefault()}
                                            className="w-48 shadow-lg rounded-md p-1 backdrop-blur-sm border"
                                            style={{
                                                background: panelTone === 'dark'
                                                    ? 'rgba(15, 23, 42, 0.95)'
                                                    : 'rgba(255, 255, 255, 0.95)',
                                                borderColor: panelTone === 'dark'
                                                    ? 'rgba(var(--merchant-primary), 0.3)'
                                                    : 'rgba(var(--merchant-primary), 0.2)',
                                                color: panelTone === 'dark' ? '#f1f5f9' : '#0f172a'
                                            }}
                                        >
                                            {props.openEditThumbnail && (
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        props.openEditThumbnail?.();
                                                    }}
                                                    className="group px-3 py-2.5 cursor-pointer rounded-sm transition-all duration-200 ease-in-out hover:translate-x-1"
                                                    style={{
                                                        color: panelTone === 'dark' ? '#f1f5f9' : '#0f172a'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = `rgba(var(--merchant-primary), 0.2)`;
                                                        e.currentTarget.style.boxShadow = `0 0 0 1px rgba(var(--merchant-primary), 0.3)`;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    <PaintRollerIcon className="mr-3 h-4 w-4 transition-all duration-200 group-hover:text-amber-500" />
                                                    <span className="text-sm font-medium">Format Tile</span>
                                                </DropdownMenuItem>
                                            )}
                                            {props.onEditListing && (
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        props.onEditListing?.();
                                                    }}
                                                    className="group px-3 py-2.5 cursor-pointer rounded-sm transition-all duration-200 ease-in-out hover:translate-x-1"
                                                    style={{
                                                        color: panelTone === 'dark' ? '#f1f5f9' : '#0f172a'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = `rgba(var(--merchant-primary), 0.2)`;
                                                        e.currentTarget.style.boxShadow = `0 0 0 1px rgba(var(--merchant-primary), 0.3)`;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    <Edit className="mr-3 h-4 w-4 transition-all duration-200 group-hover:text-amber-500" />
                                                    <span className="text-sm font-medium">Edit Details</span>
                                                </DropdownMenuItem>
                                            )}
                                            {props.listing.type === 'PRODUCT' && props.onToggleLiveStatus && (
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        props.onToggleLiveStatus?.(!props.listing.isLive);
                                                    }}
                                                    disabled={props.isTogglingLive}
                                                    className="group px-3 py-2.5 cursor-pointer rounded-sm transition-all duration-200 ease-in-out hover:translate-x-1"
                                                    style={{
                                                        color: panelTone === 'dark' ? '#f1f5f9' : '#0f172a'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = `rgba(var(--merchant-primary), 0.2)`;
                                                        e.currentTarget.style.boxShadow = `0 0 0 1px rgba(var(--merchant-primary), 0.3)`;
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    {props.isTogglingLive ? (
                                                        <Loader2 className="mr-3 h-4 w-4 animate-spin" />
                                                    ) : props.listing.isLive ? (
                                                        <EyeOff className="mr-3 h-4 w-4 transition-all duration-200 group-hover:text-amber-500" />
                                                    ) : (
                                                        <Eye className="mr-3 h-4 w-4 transition-all duration-200 group-hover:text-green-500" />
                                                    )}
                                                    <span className="text-sm font-medium">
                                                        {props.isTogglingLive
                                                            ? 'Updating...'
                                                            : props.listing.isLive
                                                                ? 'Move to Draft'
                                                                : 'Make Live'}
                                                    </span>
                                                </DropdownMenuItem>
                                            )}
                                            {props.onDeleteListing && (
                                                <>
                                                    <DropdownMenuSeparator
                                                        className="my-2"
                                                        style={{
                                                            backgroundColor: `rgba(var(--merchant-primary), 0.4)`,
                                                            height: '1px'
                                                        }}
                                                    />
                                                    <DropdownMenuItem
                                                        className="px-3 py-2.5 cursor-pointer rounded-sm transition-all duration-200 ease-in-out hover:translate-x-1"
                                                        style={{
                                                            background: 'transparent',
                                                            color: '#dc2626'
                                                        }}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            props.onDeleteListing?.();
                                                        }}
                                                    >
                                                        <Trash className="mr-3 h-4 w-4 transition-all duration-200" style={{ color: '#dc2626' }} />
                                                        <span className="text-sm font-medium">Delete Listing</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )
                    }
                </div>
                <div 
                    className={`p-2 px-4 h-20 w-full flex flex-col gap-1 rounded-b-${rounded}`}
                    style={getPanelStyles(merchantScheme, panelTone)}>
                    <HoverCard>
                        <HoverCardTrigger asChild>
                            <span className="text-sm font-bold truncate">
                                {props.listing.thumbnail?.title?.content || props.listing.name}
                            </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="flex flex-col gap-2">
                            <h2 className="text-md font-bold">{props.listing.thumbnail?.title?.content || props.listing.name}</h2>
                            {props.listing.thumbnail?.moreInfo?.content && !isNullOrWhitespace(props.listing.thumbnail.moreInfo.content) ? <p className="text-sm" dangerouslySetInnerHTML={{ __html: props.listing.thumbnail.moreInfo.content }} /> : <></>}
                        </HoverCardContent>
                    </HoverCard>
                    {lowest_price &&
                        <span className="text-md text-merchant-primary">
                            <CurrencySpan value={lowest_price} withAnimation={false} />
                        </span>
                    }
                </div>
            </Link>
        )
    } else {
        return <></>
    }
})

CatalogueItem.displayName = "CatalogueItem"

export default CatalogueItem;
