'use client'

import React, { JSX } from "react";
import SideNav, { NavOption } from "@/components/ui/sidenav";
import {
    LayoutDashboard,
    Sparkles,
    Calendar,
    CalendarDays,
    Clock,
    User,
    ExternalLink,
    BookOpen,
    Mail,
    FileText,
    Tags,
    Wand2,
    GraduationCap,
    Compass,
    Video,
    Link,
    Mic,
    Sun,
    Pin,
    Quote,
    Store,
    Plus,
    Settings,
    ImageIcon,
    Receipt,
    Radio,
    Headphones,
    PiggyBank,
    CreditCard,
    FileCheck,
} from "lucide-react";
import { VendorDocType } from "@/utils/spiriverse";
import CreateReading from "../[practitioner_slug]/(manage)/manage/services/_components/CreateReading";
import CreateHealing from "../[practitioner_slug]/(manage)/manage/services/_components/CreateHealing";
import CreateCoaching from "../[practitioner_slug]/(manage)/manage/services/_components/CreateCoaching";
import EditPractitionerBio from "./Profile/Edit/Bio";
import EditPractitionerModalities from "./Profile/Edit/Modalities";
import EditPractitionerTools from "./Profile/Edit/Tools";
import EditPractitionerTraining from "./Profile/Edit/Training";
import EditPractitionerJourney from "./Profile/Edit/Journey";
import EditPractitionerVideo from "./Profile/Edit/Video";
import EditPractitionerSocials from "./Profile/Edit/Social";
import EditPractitionerAudioIntro from "./Profile/Edit/AudioIntro";
import EditPractitionerOracleMessage from "./Profile/Edit/OracleMessage";
import EditPractitionerPinnedTestimonials from "./Profile/Edit/PinnedTestimonials";
import EditListingAppearance from "../../m/_components/Profile/Edit/ListingAppearance";
import MerchantEventsComponent from "../../m/_components/Events";
import MerchantGalleryComponent from "../../m/_components/Gallery";
import MerchantBankingComponent from "../../m/_components/Banking";
import MerchantCardsComponent from "../../m/_components/Cards";
import MerchantTaxRegistrations from "../../m/_components/TaxRegistration";
import TermsAndConditionsManager from "./TermsAndConditions";
import SpiriAssistLogo from "@/icons/spiri-assist-logo";
import { Session } from "next-auth";
import { isNullOrUndefined } from "@/lib/functions";
import withProtection from "@/components/ux/HOC/withProtection";
import HasPractitionerAccess from "../_hooks/HasPractitionerAccess";
import { useTierFeatures } from "@/hooks/UseTierFeatures";
import ShopUpgradeDialog from "@/components/subscription/ShopUpgradeDialog";
import FeatureUpgradeDialog from "@/components/subscription/FeatureUpgradeDialog";

// Helper to get user's merchants from session
const getUserMerchants = (session: Session) => {
    return session.user.vendors?.filter(v =>
        v != null && (v.docType === VendorDocType.MERCHANT || !v.docType)
    ) || [];
};

type BLProps = {
    session: Session,
    practitionerId: string,
    practitionerSlug: string
}

const useBL = (props: BLProps) => {
    const practitionerId = props.practitionerId;
    const practitionerSlug = props.practitionerSlug;

    const practitioner = props.session.user.vendors.find(v => v.id === practitionerId);
    const { features, tier } = useTierFeatures(practitionerId);
    const canCreateMerchant = features.canCreateMerchantProfile;

    const options: NavOption[] = [
        {
            label: "View Profile",
            icon: <ExternalLink className="w-5 h-5" />,
            href: `/p/${practitionerSlug}`,
            testId: "nav-view-profile"
        },
        {
            label: "Dashboard",
            icon: <LayoutDashboard className="w-5 h-5" />,
            href: `/p/${practitionerSlug}/manage`,
            testId: "nav-dashboard"
        },
        {
            label: "Messages",
            icon: <Mail className="w-5 h-5" />,
            href: `/p/${practitionerSlug}/manage/messages`,
            testId: "nav-messages"
        },
        {
            label: "Profile",
            icon: <User className="w-5 h-5" />,
            testId: "nav-profile",
            description: "Bio, Media, Availability",
            columns: 2,
            navOptions: [
                {
                    icon: <Quote className="w-5 h-5 text-amber-400" />,
                    label: "Testimonials",
                    href: `/p/${practitionerSlug}/manage/testimonials`
                },
                {
                    type: "divider",
                    label: "About You"
                },
                {
                    icon: <FileText className="w-5 h-5" />,
                    label: "Bio & Headline",
                    dialogId: "Edit Bio",
                    className: "w-[600px] max-w-[95vw]"
                },
                {
                    icon: <Tags className="w-5 h-5" />,
                    label: "Modalities",
                    dialogId: "Edit Modalities",
                    className: "w-[600px] max-w-[95vw]"
                },
                {
                    icon: <Wand2 className="w-5 h-5" />,
                    label: "Tools Collection",
                    dialogId: "Edit Tools",
                    className: "w-[700px] max-w-[95vw]"
                },
                {
                    icon: <GraduationCap className="w-5 h-5" />,
                    label: "Training & Credentials",
                    dialogId: "Edit Training",
                    className: "w-[700px] max-w-[95vw]"
                },
                {
                    icon: <Compass className="w-5 h-5" />,
                    label: "Spiritual Journey",
                    dialogId: "Edit Journey",
                    className: "w-[600px] max-w-[95vw]"
                },
                {
                    type: "divider",
                    label: "Media"
                },
                ...(features.hasVideoUpdates ? [{
                    icon: <Video className="w-5 h-5" />,
                    label: "Video Update",
                    dialogId: "Edit Video",
                    className: "w-[900px] max-w-[95vw]"
                }] : []),
                {
                    icon: <Store className="w-5 h-5" />,
                    label: "Directory Appearance",
                    dialogId: "Practitioner Directory Appearance",
                },
                {
                    icon: <ImageIcon className="w-5 h-5" />,
                    label: "Gallery",
                    dialogId: "Practitioner Gallery",
                    className: "w-[95vw] max-w-[95vw] h-[90vh] bg-slate-900 backdrop-blur-none"
                },
                {
                    icon: <Link className="w-5 h-5" />,
                    label: "Social Links",
                    dialogId: "Edit Socials",
                    className: "w-[700px] max-w-[95vw]"
                },
                {
                    icon: <Mic className="w-5 h-5" />,
                    label: "Audio Introduction",
                    dialogId: "Edit Audio Intro",
                    className: "w-[600px] max-w-[95vw]"
                },
                {
                    type: "divider" as const,
                    label: "Engagement"
                },
                {
                    icon: <Sun className="w-5 h-5 text-amber-400" />,
                    label: "Daily Oracle",
                    dialogId: "Edit Oracle Message",
                    className: "w-[600px] max-w-[95vw]"
                },
                {
                    icon: <Pin className="w-5 h-5" />,
                    label: "Pinned Reviews",
                    dialogId: "Edit Pinned Reviews",
                    className: "w-[700px] max-w-[95vw]"
                },
                ...(features.canCreateEvents ? [{
                    icon: <CalendarDays className="w-5 h-5 text-purple-400" />,
                    label: "Events",
                    dialogId: "Manage Events",
                    className: "w-[1000px] max-w-[95vw] h-[850px]"
                }] : []),
            ] as NavOption[],
        },
        {
            label: "Setup",
            icon: <Settings className="w-5 h-5" />,
            testId: "nav-setup",
            description: "Banking, Availability, Tax",
            navOptions: [
                {
                    icon: <Clock className="w-5 h-5" />,
                    label: "Availability",
                    href: `/p/${practitionerSlug}/manage/availability`
                },
                {
                    icon: <PiggyBank className="w-5 h-5" />,
                    label: "Bank",
                    dialogId: "Bank Accounts"
                },
                {
                    icon: <CreditCard className="w-5 h-5" />,
                    label: "Cards",
                    dialogId: "Payment Cards"
                },
                {
                    icon: <FileText className="w-5 h-5" />,
                    label: "Tax",
                    dialogId: "Tax Registrations"
                },
                {
                    icon: <FileCheck className="w-5 h-5" />,
                    label: "Terms & Conditions",
                    dialogId: "Terms & Conditions",
                    className: "w-[700px] max-w-[95vw]"
                },
            ] as NavOption[],
        },
        ...(features.canSellServices ? [{
            label: "Journeys",
            icon: <Headphones className="w-5 h-5" />,
            testId: "nav-journeys",
            href: `/p/${practitionerSlug}/manage/journeys`,
            description: "Audio meditations & recordings",
        }] as NavOption[] : [] as NavOption[]),
        {
            label: "Bookings",
            icon: <Calendar className="w-5 h-5" />,
            testId: "nav-bookings",
            href: `/p/${practitionerSlug}/manage/bookings`,
        },
        // Feature items — unlocked ones appear inline, locked ones grouped under a divider at the bottom
        ...(() => {
            const featureItems = [
                { label: "Services", icon: <BookOpen className="w-5 h-5" />, testId: "nav-services-locked", href: `/p/${practitionerSlug}/manage/services`, dialogId: "Upgrade Services", unlocked: features.canSellServices },
                { label: "Payment Links", icon: <Receipt className="w-5 h-5" />, testId: "nav-payment-links", href: `/p/${practitionerSlug}/manage/payment-links`, dialogId: "Upgrade Payment Links", unlocked: features.hasPaymentLinks },
                { label: "Live Assist", icon: <Radio className="w-5 h-5" />, testId: "nav-live-assist", href: `/p/${practitionerSlug}/manage/live-assist`, dialogId: "Upgrade Live Assist", unlocked: features.hasLiveAssist },
                { label: "Expo Mode", icon: <Store className="w-5 h-5" />, testId: "nav-expo-mode", href: `/p/${practitionerSlug}/manage/expo-mode`, dialogId: "Upgrade Expo Mode", unlocked: features.hasExpoMode },
                { label: "SpiriReadings", icon: <Sparkles className="w-5 h-5 text-purple-400" />, testId: "nav-spiri-readings", href: `/p/${practitionerSlug}/manage/readings`, dialogId: "Upgrade SpiriReadings", unlocked: features.hasSpiriReadings },
                { label: "SpiriAssist", icon: <div className="flex items-center justify-center"><SpiriAssistLogo height={20} /></div>, testId: "nav-spiri-assist", href: `/p/${practitionerSlug}/manage/spiri-assist`, dialogId: "Upgrade SpiriAssist", unlocked: features.hasSpiriAssist },
            ];

            const unlocked: NavOption[] = featureItems.filter(f => f.unlocked).map(f => ({
                label: f.label, icon: f.icon, testId: f.testId, href: f.href,
            }));
            const locked: NavOption[] = featureItems.filter(f => !f.unlocked).map(f => ({
                label: f.label, icon: f.icon, testId: f.testId, dialogId: f.dialogId,
            }));

            // Shop Fronts — unlocked on manifest+, otherwise locked
            const shopFrontsItem: NavOption = canCreateMerchant
                ? {
                    label: "Shop Fronts",
                    icon: <Store className="w-5 h-5 text-amber-500" />,
                    testId: "nav-shop-fronts",
                    navOptions: [
                        {
                            icon: <Plus className="w-5 h-5" />,
                            label: "Open New Shop",
                            href: "/setup",
                            testId: "open-new-shop-btn"
                        },
                        ...getUserMerchants(props.session).map(merchant => ({
                            icon: <Store className="w-5 h-5" />,
                            label: merchant.name,
                            href: `/m/${merchant.slug}`
                        })),
                        ...(getUserMerchants(props.session).length > 0 ? [
                            { type: "divider" as const, label: "" },
                            {
                                icon: <Settings className="w-5 h-5" />,
                                label: "Manage Linked Shops",
                                href: `/p/${practitionerSlug}/manage/shopfronts`
                            }
                        ] : [])
                    ],
                }
                : {
                    label: "Shop Fronts",
                    icon: <Store className="w-5 h-5" />,
                    testId: "nav-shop-fronts",
                    dialogId: "Shop Upgrade",
                };

            if (canCreateMerchant) {
                unlocked.push(shopFrontsItem);
            } else {
                locked.push(shopFrontsItem);
            }

            return [
                ...unlocked,
                ...(locked.length > 0 ? [
                    { type: "divider" as const, label: "More Features" },
                    ...locked,
                ] : []),
            ];
        })(),
    ];

    const dialogMapping: Record<string, (onClose: () => void) => JSX.Element> = !isNullOrUndefined(practitioner)
        ? {
            // Create service dialogs (triggered from services page)
            "Create Reading": () => <CreateReading merchantId={practitionerId} />,
            "Create Healing": () => <CreateHealing merchantId={practitionerId} />,
            "Create Coaching": () => <CreateCoaching merchantId={practitionerId} />,
            // Events
            "Manage Events": () => <MerchantEventsComponent merchantId={practitionerId} />,
            // Profile Edit Dialogs
            "Edit Bio": () => <EditPractitionerBio practitionerId={practitionerId} />,
            "Edit Modalities": () => <EditPractitionerModalities practitionerId={practitionerId} />,
            "Edit Tools": () => <EditPractitionerTools practitionerId={practitionerId} />,
            "Edit Training": () => <EditPractitionerTraining practitionerId={practitionerId} />,
            "Edit Journey": () => <EditPractitionerJourney practitionerId={practitionerId} />,
            "Edit Video": () => <EditPractitionerVideo practitionerId={practitionerId} />,
            "Practitioner Gallery": () => <MerchantGalleryComponent merchantId={practitionerId} />,
            "Practitioner Directory Appearance": () => <EditListingAppearance merchantId={practitionerId} thumbnailType="square" />,
            "Edit Socials": () => <EditPractitionerSocials practitionerId={practitionerId} />,
            "Edit Audio Intro": () => <EditPractitionerAudioIntro practitionerId={practitionerId} />,
            "Edit Oracle Message": () => <EditPractitionerOracleMessage practitionerId={practitionerId} />,
            "Edit Pinned Reviews": () => <EditPractitionerPinnedTestimonials practitionerId={practitionerId} />,
            // Payment dialogs (opened via CustomEvent from subscription page)
            "Bank Accounts": () => <MerchantBankingComponent merchantId={practitionerId} />,
            "Payment Cards": () => <MerchantCardsComponent merchantId={practitionerId} />,
            "Tax Registrations": () => <MerchantTaxRegistrations merchantId={practitionerId} />,
            "Terms & Conditions": () => <TermsAndConditionsManager practitionerId={practitionerId} />,
            // Shop upgrade dialog for Awaken/Illuminate tiers
            "Shop Upgrade": (onClose) => <ShopUpgradeDialog vendorId={practitionerId} currentTier={tier || 'awaken'} onClose={onClose} />,
            // Feature upgrade dialogs for gated nav items
            "Upgrade Services": (onClose) => <FeatureUpgradeDialog vendorId={practitionerId} featureName="Services" targetTier="awaken" targetTierName="Awaken" onClose={onClose} benefits={["Create and sell readings, healings, and coaching", "Accept payments from clients", "Manage bookings and availability"]} />,
            "Upgrade Payment Links": (onClose) => <FeatureUpgradeDialog vendorId={practitionerId} featureName="Payment Links" targetTier="illuminate" targetTierName="Illuminate" onClose={onClose} benefits={["Send payment links via email", "Collect payments at expos and events", "Track payment status and history"]} />,
            "Upgrade Live Assist": (onClose) => <FeatureUpgradeDialog vendorId={practitionerId} featureName="Live Assist" targetTier="illuminate" targetTierName="Illuminate" onClose={onClose} benefits={["Go live on any platform", "Collect requests and payments in real-time", "Track revenue and session stats"]} />,
            "Upgrade Expo Mode": (onClose) => <FeatureUpgradeDialog vendorId={practitionerId} featureName="Expo Mode" targetTier="illuminate" targetTierName="Illuminate" onClose={onClose} benefits={["Create popup shops with QR codes", "Take payments at expos and markets", "Track inventory in real-time"]} />,
            "Upgrade SpiriReadings": (onClose) => <FeatureUpgradeDialog vendorId={practitionerId} featureName="SpiriReadings" targetTier="awaken" targetTierName="Awaken" onClose={onClose} benefits={["Claim and fulfill reading requests from the community", "Earn payouts for tarot, astrology, and oracle readings", "Build your reputation with client reviews"]} />,
            "Upgrade SpiriAssist": (onClose) => <FeatureUpgradeDialog vendorId={practitionerId} featureName="SpiriAssist" targetTier="directory" targetTierName="Directory" onClose={onClose} benefits={["Browse and apply to paranormal cases", "Submit proposals with your own pricing", "Manage investigations end-to-end"]} />,
        }
        : {};

    const renderDialog = (dialogKey: string, onClose: () => void): JSX.Element => {
        const DialogComponent = dialogMapping[dialogKey];
        return DialogComponent ? DialogComponent(onClose) : <></>;
    };

    return {
        hasPractitionerAccess: !isNullOrUndefined(practitioner),
        options: {
            get: options
        },
        renderDialog
    }
}

type Props = BLProps & {}

const PractitionerSideNavComponent: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <div className="hidden md:block">
            <SideNav
                aria-label="practitioner-side-nav"
                className="mt-2 ml-2"
                navOptions={bl.options.get}
                renderDialog={bl.renderDialog}
            />
        </div>
    );
}

const PractitionerSideNav = withProtection<Props>(PractitionerSideNavComponent, HasPractitionerAccess);

export default PractitionerSideNav;
