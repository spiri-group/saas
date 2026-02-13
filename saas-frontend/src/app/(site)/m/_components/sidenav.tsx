'use client'

import React, { JSX } from "react";

import SideNav, { NavOption } from "@/components/ui/sidenav";
import EditTeamMembers from "./Profile/Edit/TeamMembers";
import EditCatalogueBanner from "./Profile/Edit/PromiseBanner";
import { AlignLeftIcon, BoxIcon, Building2, FileTextIcon, HistoryIcon, NewspaperIcon, PaintbrushIcon, PhoneIcon, RefreshCwIcon, RotateCcwIcon, Share2Icon, StoreIcon, TruckIcon, Users2Icon, Package, AlertTriangle, ImageIcon, PiggyBank, CreditCardIcon, VideoIcon, Sparkles, MapPin, ShoppingCart, Calendar, LayoutDashboard, Mail, User, Wallet } from "lucide-react";
import EditTourDetails from "../[merchant_slug]/(manage)/manage/tour/_components/Edit/TourDetails/EditTourDetails";
import EditItinerary from "../[merchant_slug]/(manage)/manage/tour/_components/Edit/Itinerary";
import CreateTour from "../[merchant_slug]/(manage)/manage/tour/_components/Create";
import CreateProduct from "../[merchant_slug]/(site)/product/_components/Create";
import UpdateListing from "./UpdateListing";
import MerchantBankingComponent from "./Banking";
import MerchantCardsComponent from "./Cards";
import MerchantContactComponent from "./Profile/Edit/Contact";
import { useEffect, useState } from "react";
import MerchantBrandingComponent from "./Profile/Edit/Branding";
import EditMerchantDescriptionsComponent from "./Profile/Edit/Descriptions";
import EditMerchantLocations from "./Profile/Edit/Locations";
import EditMerchantIntro from "./Profile/Edit/Intro";
import EditMerchantVideo from "./Profile/Edit/Video";
import EditMerchantSocials from "./Profile/Edit/Social";
import SpiriAssistLogo from "@/icons/spiri-assist-logo";
import { Session } from "next-auth";
import { isNullOrUndefined } from "@/lib/functions";
import { useTierFeatures } from "@/hooks/UseTierFeatures";
import { UseInventoryOverview } from "../[merchant_slug]/(manage)/manage/inventory/_hooks/UseInventoryOverview";

import MerchantTaxRegistrations from "./TaxRegistration";
import UpsertRefundPolicies from "./Profile/Edit/RefundPolicies";
import EditListingAppearance from "./Profile/Edit/ListingAppearance";
import MerchantEventsComponent from "./Events";
import MerchantGalleryComponent from "./Gallery";
import withProtection from "@/components/ux/HOC/withProtection";
import HasMerchantAccess from "../_hooks/HasMerchantAccess";
import { useCustomerViewMode } from "../_hooks/UseCustomerViewMode";

type BLProps = {
    session: Session,
    merchantId: string,
    merchantSlug: string
}

const useBL = (props: BLProps) => {

    const merchantId = props.merchantId
    const merchantSlug = props.merchantSlug

    const [editBrandingActive, setEditBrandingActive] = useState(false);

    const merchant = props.session.user.vendors.find(v => v.id === merchantId);
    const { features } = useTierFeatures(merchantId);
    const inventoryOverview = UseInventoryOverview(merchantId, "default");

    const canHostPractitioners = features.canHostPractitioners;
    const hasInventoryAutomation = features.hasInventoryAutomation;
    const canCreateTours = features.canCreateTours;
    const hasSpiriAssist = features.hasSpiriAssist;
    const productLimit = features.maxProducts;
    const productCount = inventoryOverview.data?.total_products ?? 0;

    // Product badge: show count/limit (e.g. "3/10") or just count for unlimited
    const productBadge = productLimit !== null ? `${productCount}/${productLimit}` : undefined;
    const productBadgeVariant: "default" | "warning" | "danger" | undefined =
        productLimit !== null && productLimit > 0
            ? productCount >= productLimit
                ? "danger"
                : productCount >= productLimit * 0.8
                    ? "warning"
                    : "default"
            : undefined;
    const productDisabled = productLimit === 0 || (productLimit !== null && productCount >= productLimit);
    const productDisabledReason = productLimit === 0
        ? "Open your shop with up to 10 products"
        : productLimit !== null && productCount >= productLimit
            ? `Product limit reached (${productLimit}). Upgrade for more.`
            : undefined;

    const options : NavOption[] =  [
        {
            icon: <StoreIcon className="w-5 h-5" />,
            label: "View Store",
            href: `/m/${merchantSlug}`,
            testId: "nav-view-store"
        },
        {
            icon: <LayoutDashboard className="w-5 h-5" />,
            label: "Dashboard",
            href: `/m/${merchantSlug}/manage`,
            testId: "nav-dashboard"
        },
        {
            icon: <Mail className="w-5 h-5" />,
            label: "Messages",
            href: `/m/${merchantSlug}/manage/customers/messages`,
            testId: "nav-messages"
        },
        {
            icon: <ShoppingCart className="w-5 h-5" />,
            label: "Catalogue",
            testId: "nav-catalogue",
            description: "Products, Tours, Events",
            columns: 2,
            navOptions: [
                {
                    type: "divider",
                    label: "Create"
                },
                {
                    icon: <ShoppingCart className="w-5 h-5" />,
                    label: "New Product",
                    dialogId: "Create Product",
                    badge: productBadge,
                    badgeVariant: productBadgeVariant,
                    disabled: productDisabled,
                    disabledReason: productDisabledReason,
                    requiredTier: productLimit === 0 ? "manifest" : "transcend",
                },
                {
                    icon: <MapPin className="w-5 h-5" />,
                    label: "New Tour",
                    dialogId: "Create Tour",
                    className: "w-[870px] max-w-[95vw] h-[700px]",
                    disabled: !canCreateTours,
                    disabledReason: "Host and sell guided tours",
                    requiredTier: "transcend",
                },
                {
                    icon: <FileTextIcon className="w-5 h-5" />,
                    label: "Update Listing",
                    dialogId: "Update Listing",
                    className: "w-[870px] max-w-[95vw] h-[700px]"
                },
                {
                    type: "divider",
                    label: "Manage"
                },
                {
                    icon: <Calendar className="w-5 h-5" />,
                    label: "Events & Tours",
                    href: `/m/${merchantSlug}/manage/events-and-tours`
                },
            ],
        },
        {
            icon: <User className="w-5 h-5" />,
            label: "Profile",
            testId: "nav-profile",
            description: "Customise, Setup, Branding",
            columns: 2,
            navOptions: [
                {
                    type: "divider",
                    label: "Customise"
                },
                {
                    icon: <AlignLeftIcon className="w-5 h-5" />,
                    label: "Intro",
                    dialogId: "Merchant Intro"
                },
                {
                    icon: <PhoneIcon className="w-5 h-5" />,
                    label: "Contact Details",
                    dialogId: "Merchant Contact"
                },
                {
                    icon: <Share2Icon className="w-5 h-5" />,
                    label: "Social URLs",
                    dialogId: "Merchant Socials"
                },
                {
                    icon: <NewspaperIcon className="w-5 h-5" />,
                    label: "About",
                    dialogId: "Merchant Descriptions"
                },
                {
                    icon: <Users2Icon className="w-5 h-5" />,
                    label: "Team Members",
                    dialogId: "Merchant Team members"
                },
                {
                    icon: <Users2Icon className="w-5 h-5" />,
                    label: "Featured Practitioners",
                    href: `/m/${merchantSlug}/manage/featuring`,
                    disabled: !canHostPractitioners,
                    disabledReason: "Host featured practitioners on your storefront",
                    requiredTier: "transcend",
                },
                {
                    type: "divider",
                    label: "Setup"
                },
                {
                    icon: <PiggyBank className="w-5 h-5" />,
                    label: "Bank",
                    dialogId: "Bank Accounts"
                },
                {
                    icon: <CreditCardIcon className="w-5 h-5" />,
                    label: "Cards",
                    dialogId: "Payment Cards"
                },
                {
                    icon: <FileTextIcon className="w-5 h-5" />,
                    label: "Tax",
                    dialogId: "Tax Registrations"
                },
                {
                    icon: <Wallet className="w-5 h-5" />,
                    label: "Subscription",
                    href: `/m/${merchantSlug}/manage/subscription`,
                    testId: "nav-subscription"
                },
                {
                    icon: <Building2 className="w-5 h-5" />,
                    label: "Locations",
                    dialogId: "Merchant Locations"
                },
                {
                    icon: <RotateCcwIcon className="w-5 h-5" />,
                    label: "Returns / Cancels",
                    dialogId: "Merchant Returns & Cancels"
                },
                {
                    type: "divider",
                    label: ""
                },
                {
                    icon: <PaintbrushIcon className="w-5 h-5" />,
                    label: "Branding",
                    replaceNav: true,
                }
            ]
        },
        {
            icon: <Sparkles className="w-5 h-5" />,
            label: "Marketing",
            testId: "nav-marketing",
            description: "Banner, Events, Gallery",
            navOptions: [
                {
                    icon: <Sparkles className="w-5 h-5" />,
                    label: "Catalogue Banner",
                    dialogId: "Catalogue Banner"
                },
                {
                    icon: <Calendar className="w-5 h-5" />,
                    label: "Events",
                    dialogId: "Merchant Events"
                },
                {
                    icon: <VideoIcon className="w-5 h-5" />,
                    label: "Video Update",
                    dialogId: "Merchant Video"
                },
                {
                    icon: <StoreIcon className="w-5 h-5" />,
                    label: "Listing Appearance",
                    dialogId: "Merchant Listing Appearance"
                },
                {
                    icon: <ImageIcon className="w-5 h-5" />,
                    label: "Gallery",
                    dialogId: "Merchant Gallery"
                }
            ]
        },
        {
            icon: <Package className="w-5 h-5" />,
            label: "Orders & Fulfilment",
            testId: "nav-orders",
            description: "Shipping, Inventory, Refunds",
            columns: 2,
            navOptions: [
                {
                    type: "divider",
                    label: "Orders"
                },
                {
                    icon: <HistoryIcon className="w-5 h-5" />,
                    label: "Order History",
                    href: `/m/${merchantSlug}/manage/customers/history`
                },
                {
                    icon: <BoxIcon className="w-5 h-5" />,
                    label: "Pack Shipments",
                    href: `/m/${merchantSlug}/manage/customers/shipments`
                },
                {
                    icon: <TruckIcon className="w-5 h-5" />,
                    label: "Track Deliveries",
                    href: `/m/${merchantSlug}/manage/customers/deliveries`
                },
                {
                    icon: <RefreshCwIcon className="w-5 h-5" />,
                    label: "Handle Refunds",
                    href: `/m/${merchantSlug}/manage/customers/refunds`
                },
                {
                    type: "divider",
                    label: "Inventory"
                },
                {
                    icon: <Package className="w-5 h-5" />,
                    label: "Overview",
                    href: `/m/${merchantSlug}/manage/inventory`,
                    disabled: !hasInventoryAutomation,
                    disabledReason: "Automate inventory tracking and alerts",
                    requiredTier: "manifest",
                },
                {
                    icon: <AlertTriangle className="w-5 h-5" />,
                    label: "Stock Alerts",
                    href: `/m/${merchantSlug}/manage/inventory/alerts`,
                    disabled: !hasInventoryAutomation,
                    disabledReason: "Automate inventory tracking and alerts",
                    requiredTier: "manifest",
                },
                {
                    icon: <HistoryIcon className="w-5 h-5" />,
                    label: "Transactions",
                    href: `/m/${merchantSlug}/manage/inventory/transactions`,
                    disabled: !hasInventoryAutomation,
                    disabledReason: "Automate inventory tracking and alerts",
                    requiredTier: "manifest",
                }
            ]
        },
        {
            icon: <div className="flex items-center justify-center"><SpiriAssistLogo height={20} /></div>,
            label: "SpiriAssist",
            testId: "nav-spiri-assist",
            href: `/m/${merchantSlug}/manage/spiri-assist`,
            disabled: !hasSpiriAssist,
            disabledReason: "Paranormal investigations with SpiriAssist",
            requiredTier: "manifest",
        },
    ]

    const dialogMapping: Record<string, (onClose: () => void) => JSX.Element> = !isNullOrUndefined(merchant) ?
    {
        "Merchant Intro": () => <EditMerchantIntro merchantId={merchantId} />,
        "Merchant Contact": () => <MerchantContactComponent merchantId={merchantId} />,
        "Merchant Locations": () => <EditMerchantLocations merchantId={merchantId} />,
        "Merchant Descriptions": () => <EditMerchantDescriptionsComponent merchantId={merchantId} />,
        "Merchant Video": () => <EditMerchantVideo merchantId={merchantId} />,
        "Merchant Team members": () => <EditTeamMembers merchantId={merchantId} />,
        "Merchant Socials": () => <EditMerchantSocials merchantId={merchantId} />,
        "Catalogue Banner": () => <EditCatalogueBanner merchantId={merchantId} />,
        "Bank Accounts": () => <MerchantBankingComponent merchantId={merchantId} />,
        "Payment Cards": () => <MerchantCardsComponent merchantId={merchantId} />,
        "Tax Registrations": () => <MerchantTaxRegistrations merchantId={merchantId} />,
        "Update Listing": (onClose) => <UpdateListing merchantId={merchantId} onClose={onClose} />,
        "Create Tour": () => <CreateTour merchantId={merchantId} />,
        "Create Product": () => <CreateProduct merchantId={merchantId} merchantCurrency={merchant.currency} />,
        "Edit Tour Details": () => <EditTourDetails merchantId={merchantId} vendorId={merchantId} />,
        "Edit Itinerary": () => <EditItinerary merchantId={merchantId} />,
        "Merchant Returns & Cancels": () => <UpsertRefundPolicies merchantId={merchantId} />,
        "Merchant Listing Appearance": () => <EditListingAppearance merchantId={merchantId} />,
        "Merchant Events": () => <MerchantEventsComponent merchantId={merchantId} />,
        "Merchant Gallery": () => <MerchantGalleryComponent merchantId={merchantId} />
    } : {};

    const renderDialog = (dialogKey: string, onClose: () => void): JSX.Element => {
        const DialogComponent = dialogMapping[dialogKey];
        return DialogComponent ? DialogComponent(onClose) : <></>;
    };

    // we need to subscribe to the open-nav event
    // this is because branding will launch a different side nav
    
    useEffect(() => {
        const openNav = (e: CustomEvent) => {
            if (e.detail) {
                const { path } = e.detail;
                if (path.includes("Branding")) {
                    setEditBrandingActive(true);
                }
            }
        }
        window.addEventListener("open-nav", openNav);
        return () => window.removeEventListener("open-nav", openNav);
    }, []);

    return {
        hasRoleInMerchant: !isNullOrUndefined(merchant),
        options: {
            get: options
        },
        editBranding: {
            active: editBrandingActive,
            toggle: () => setEditBrandingActive(!editBrandingActive)
        },
        renderDialog
    }
}

type Props = BLProps & {
    
}

const MerchantSideNavComponent : React.FC<Props> = (props) => {
    const bl = useBL(props);
    const isCustomerViewMode = useCustomerViewMode();

    // Hide side nav completely in customer view mode
    if (isCustomerViewMode) {
        return null;
    }

    return (
        <>
        { 
            bl.editBranding.active ? 
               <MerchantBrandingComponent
                    merchantId={props.merchantId}
                    close={() => {
                        bl.editBranding.toggle();
                    }} />
            :  <div className="hidden md:block">
                    <SideNav
                        aria-label="merchant-side-nav"
                        className="mt-2 ml-2"
                        navOptions={bl.options.get} 
                        renderDialog={bl.renderDialog} />
               </div>
        }
        </>
    )
}

const MerchantSideNav = withProtection<Props>(MerchantSideNavComponent, HasMerchantAccess)

export default MerchantSideNav;