'use client'

import React, { JSX } from "react";
import PersonWalking from "@/icons/person-walking";
import SideNav, { NavOption } from "@/components/ui/sidenav";
import EditTeamMembers from "./Profile/Edit/TeamMembers";
import EditBanner from "./Profile/Edit/Profile/EditBanner";
import EditCatalogueBanner from "./Profile/Edit/PromiseBanner";
import { AlignLeftIcon, BoxIcon, Building2, FileTextIcon, HistoryIcon, NewspaperIcon, PaintbrushIcon, PhoneIcon, RefreshCwIcon, RotateCcwIcon, Share2Icon, StoreIcon, TruckIcon, Users2Icon, Package, AlertTriangle, ImageIcon, PiggyBank, CreditCardIcon, VideoIcon, Sparkles, MapPin, ShoppingCart, Calendar, HeartHandshake, LayoutDashboard } from "lucide-react";
import EditTourDetails from "../[merchant_slug]/(manage)/manage/tour/_components/Edit/TourDetails/EditTourDetails";
import EditItinerary from "../[merchant_slug]/(manage)/manage/tour/_components/Edit/Itinerary";
import CreateSocialPost from "../[merchant_slug]/(manage)/manage/social/components/Create";
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
import { VendorDocType } from "@/utils/spiriverse";
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

    // Find if user has a practitioner profile
    const practitionerVendor = props.session.user.vendors.find(v => v.docType === VendorDocType.PRACTITIONER);
    const servicesHref = practitionerVendor ? `/p/${practitionerVendor.slug}` : '/p/setup';

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
            label: "Messages",
            href: `/m/${merchantSlug}/manage/customers/messages`
        },
        {
            label: "Profile",
            navOptions: [
                {
                    label: "Customise",
                    navOptions: [
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
                            label: "Explore",
                            dialogId: "Merchant Descriptions"
                        },
                        {
                            icon: <Users2Icon className="w-5 h-5" />,
                            label: "Team Members",
                            dialogId: "Merchant Team members"
                        }
                    ]
                },
                {
                    label: "Setup",
                    navOptions: [
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
                            icon: <Building2 className="w-5 h-5" />,
                            label: "Locations",
                            dialogId: "Merchant Locations"
                        },
                        {
                            icon: <RotateCcwIcon className="w-5 h-5" />,
                            label: "Returns / Cancels",
                            dialogId: "Merchant Returns & Cancels"
                        }
                    ]
                },
                {
                    icon: <PaintbrushIcon className="w-5 h-5" />,
                    label: "Branding",
                    replaceNav: true,
                }
            ]
        },
        {
            label: "Catalogue",
            navOptions: [
                {
                    icon: <MapPin className="w-5 h-5" />,
                    label: "New Tour",
                    dialogId: "Create Tour",
                    className: "w-[870px] h-[700px]"
                },
                {
                    icon: <ShoppingCart className="w-5 h-5" />,
                    label: "New Product",
                    dialogId: "Create Product"
                },
                {
                    type: "divider",
                    label: ""
                },
                {
                    icon: <FileTextIcon className="w-5 h-5" />,
                    label: "Update Listing",
                    dialogId: "Update Listing",
                    className: "w-[870px] h-[700px]"
                }
            ],
        },
        {
            label: "Marketing",
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
                    label: "On Catalogue",
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
            label: "Customer Orders",
            navOptions: [
                {
                    icon: <HistoryIcon className="w-5 h-5" />,
                    label: "History",
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
                }
            ]
        },
        {
            label: "Inventory",
            navOptions: [
                {
                    icon: <Package className="w-5 h-5" />,
                    label: "Overview",
                    href: `/m/${merchantSlug}/manage/inventory`
                },
                {
                    icon: <AlertTriangle className="w-5 h-5" />,
                    label: "Alerts",
                    href: `/m/${merchantSlug}/manage/inventory/alerts`
                },
                {
                    icon: <HistoryIcon className="w-5 h-5" />,
                    label: "Transactions",
                    href: `/m/${merchantSlug}/manage/inventory/transactions`
                }
            ]
        },
        // {
        //     icon: <PeopleArrows height={25} fillColor="accent"/>,
        //     label: "Social",
        //     navOptions: [
        //         {
        //             icon: <PeopleArrows height={25} fillColor="accent"/>,
        //             label: "Post a message",
        //             dialog: <CreateSocialPost />,
        //             className: "w-[870px] h-[660px]"
        //         }
        //     ]
        // },
        
        {
            type: "navgroup",
            label: "Manage",
            navOptions: [
                {
                    icon: <div className="flex items-center justify-center"><SpiriAssistLogo height={20} /></div>,
                    label: "SpiriAssist",
                    href: `/m/${merchantSlug}/manage/spiri-assist`
                },
                {
                    icon: <PersonWalking height={20} fillVariant="accent" />,
                    label: "Event / Tours",
                    href: `/m/${merchantSlug}/manage/events-and-tours`
                },
                {
                    icon: <Users2Icon className="w-5 h-5 text-emerald-400" />,
                    label: "Featured Practitioners",
                    href: `/m/${merchantSlug}/manage/featuring`
                }
            ]
        },
        {
            icon: <HeartHandshake className="w-5 h-5 text-pink-400" />,
            label: "Services",
            href: servicesHref
        },
        // {
        //     icon: <Pencil height={25} fillColor="accent" />,
        //     label: "Edit Event / Tour",
        //     navOptions: [
        //         {
        //             icon: <></>,
        //             label: "Edit Tour Details",
        //             dialog: <EditTourDetails merchantId={merchantId} vendorId={merchantId} />,
        //             className: "w-[950px] h-[700px]"
        //         },
        //         {
        //             icon: <></>,
        //             label: "Edit Ticket",
        //             dialog: <></>,
        //             className: "w-[900px] h-[600px]"
        //         },
        //         {
        //             icon: <></>,
        //             label: "Edit Itinerary",
        //             dialog: <EditItinerary merchantId={merchantId} />,
        //             className: "w-[900px] h-[600px]"
        //         }
        //     ]
        // }
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
        "Profile banner": () => <EditBanner merchantId={merchantId} />,
        "Catalogue Banner": () => <EditCatalogueBanner merchantId={merchantId} />,
        "Bank Accounts": () => <MerchantBankingComponent merchantId={merchantId} />,
        "Payment Cards": () => <MerchantCardsComponent merchantId={merchantId} />,
        "Tax Registrations": () => <MerchantTaxRegistrations merchantId={merchantId} />,
        "Update Listing": (onClose) => <UpdateListing merchantId={merchantId} onClose={onClose} />,
        "Create Tour": () => <CreateTour merchantId={merchantId} />,
        "Create Product": () => <CreateProduct merchantId={merchantId} merchantCurrency={merchant.currency} />,
        "Post a message": () => <CreateSocialPost />,
        "Edit Tour Details": () => <EditTourDetails merchantId={merchantId} vendorId={merchantId} />,
        "Edit Itinerary": () => <EditItinerary merchantId={merchantId} />,
        "Merchant Returns & Cancels": () => <UpsertRefundPolicies merchantId={merchantId} />,
        "Merchant Listing Appearance": () => <EditListingAppearance merchantId={merchantId} />,
        "Merchant Events": () => <MerchantEventsComponent merchantId={merchantId} />,
        "Merchant Gallery": () => <MerchantGalleryComponent merchantId={merchantId} />
    } : {};

    // Usage example
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