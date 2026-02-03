'use client'

import React, { JSX } from "react";
import SideNav, { NavOption } from "@/components/ui/sidenav";
import {
    LayoutDashboard,
    Sparkles,
    Heart,
    MessageCircle,
    Calendar,
    CalendarDays,
    Clock,
    User,
    ExternalLink,
    BookOpen,
    ClipboardList,
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
    Settings
} from "lucide-react";
import { VendorDocType } from "@/utils/spiriverse";
import CreateReading from "../../m/[merchant_slug]/(manage)/manage/services/_components/CreateReading";
import CreateHealing from "../../m/[merchant_slug]/(manage)/manage/services/_components/CreateHealing";
import CreateCoaching from "../../m/[merchant_slug]/(manage)/manage/services/_components/CreateCoaching";
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
import MerchantEventsComponent from "../../m/_components/Events";
import { Session } from "next-auth";
import { isNullOrUndefined } from "@/lib/functions";
import withProtection from "@/components/ux/HOC/withProtection";
import HasPractitionerAccess from "../_hooks/HasPractitionerAccess";

// Helper to get user's merchants from session
const getUserMerchants = (session: Session) => {
    return session.user.vendors?.filter(v =>
        v.docType === VendorDocType.MERCHANT || !v.docType // Legacy vendors without docType are merchants
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

    const options: NavOption[] = [
        {
            label: "Go to Profile",
            icon: <ExternalLink className="w-5 h-5" />,
            href: `/p/${practitionerSlug}`,
        },
        {
            label: "Dashboard",
            icon: <LayoutDashboard className="w-5 h-5" />,
            href: `/p/${practitionerSlug}/manage`,
        },
        {
            label: "Messages",
            icon: <Mail className="w-5 h-5" />,
            href: `/p/${practitionerSlug}/manage/messages`,
        },
        {
            label: "My Services",
            navOptions: [
                {
                    icon: <Sparkles className="w-5 h-5" />,
                    label: "New Reading",
                    dialogId: "Create Reading",
                    className: "w-[1000px] max-w-[95vw] h-[800px]"
                },
                {
                    icon: <Heart className="w-5 h-5" />,
                    label: "New Healing",
                    dialogId: "Create Healing",
                    className: "w-[870px] h-[700px]"
                },
                {
                    icon: <MessageCircle className="w-5 h-5" />,
                    label: "New Coaching",
                    dialogId: "Create Coaching",
                    className: "w-[870px] h-[700px]"
                },
                {
                    type: "divider",
                    label: ""
                },
                {
                    icon: <BookOpen className="w-5 h-5" />,
                    label: "View All Services",
                    href: `/p/${practitionerSlug}/manage/services`
                },
                {
                    type: "divider",
                    label: ""
                },
                {
                    icon: <ClipboardList className="w-5 h-5" />,
                    label: "Service Orders",
                    href: `/p/${practitionerSlug}/manage/services/orders`
                }
            ],
        },
        {
            label: "Reading Requests",
            icon: <Sparkles className="w-5 h-5 text-purple-400" />,
            href: `/p/${practitionerSlug}/manage/readings`,
        },
        {
            label: "Bookings",
            icon: <Calendar className="w-5 h-5" />,
            href: `/p/${practitionerSlug}/manage/bookings`,
        },
        {
            label: "Availability",
            icon: <Clock className="w-5 h-5" />,
            href: `/p/${practitionerSlug}/manage/availability`,
        },
        {
            label: "Events",
            icon: <CalendarDays className="w-5 h-5 text-purple-400" />,
            dialogId: "Manage Events",
            className: "w-[1000px] max-w-[95vw] h-[850px]"
        },
        {
            label: "Testimonials",
            icon: <Quote className="w-5 h-5 text-amber-400" />,
            href: `/p/${practitionerSlug}/manage/testimonials`,
        },
        {
            label: "Profile",
            icon: <User className="w-5 h-5" />,
            testId: "profile-submenu",
            navOptions: [
                {
                    icon: <User className="w-5 h-5" />,
                    label: "Overview",
                    href: `/p/${practitionerSlug}/manage/profile`
                },
                {
                    type: "divider",
                    label: ""
                },
                {
                    icon: <FileText className="w-5 h-5" />,
                    label: "Bio & Headline",
                    dialogId: "Edit Bio",
                    className: "w-[600px]"
                },
                {
                    icon: <Tags className="w-5 h-5" />,
                    label: "Modalities",
                    dialogId: "Edit Modalities",
                    className: "w-[600px]"
                },
                {
                    icon: <Wand2 className="w-5 h-5" />,
                    label: "Tools Collection",
                    dialogId: "Edit Tools",
                    className: "w-[700px]"
                },
                {
                    icon: <GraduationCap className="w-5 h-5" />,
                    label: "Training & Credentials",
                    dialogId: "Edit Training",
                    className: "w-[700px]"
                },
                {
                    icon: <Compass className="w-5 h-5" />,
                    label: "Spiritual Journey",
                    dialogId: "Edit Journey",
                    className: "w-[600px]"
                },
                {
                    type: "divider",
                    label: ""
                },
                {
                    icon: <Video className="w-5 h-5" />,
                    label: "Video Update",
                    dialogId: "Edit Video",
                    className: "w-[900px] max-w-[90vw]"
                },
                {
                    icon: <Link className="w-5 h-5" />,
                    label: "Social Links",
                    dialogId: "Edit Socials",
                    className: "w-[700px]"
                },
                {
                    icon: <Mic className="w-5 h-5" />,
                    label: "Audio Introduction",
                    dialogId: "Edit Audio Intro",
                    className: "w-[600px]"
                },
                {
                    type: "divider",
                    label: ""
                },
                {
                    icon: <Sun className="w-5 h-5 text-amber-400" />,
                    label: "Daily Oracle",
                    dialogId: "Edit Oracle Message",
                    className: "w-[600px]"
                },
                {
                    icon: <Pin className="w-5 h-5" />,
                    label: "Pinned Reviews",
                    dialogId: "Edit Pinned Reviews",
                    className: "w-[700px]"
                },
            ],
        },
        {
            label: "My Shop Fronts",
            icon: <Store className="w-5 h-5 text-amber-500" />,
            testId: "my-shop-fronts-nav",
            navOptions: [
                {
                    icon: <Plus className="w-5 h-5" />,
                    label: "Open New Shop",
                    href: "/m/setup",
                    testId: "open-new-shop-btn"
                },
                // Dynamically add user's existing merchants
                ...getUserMerchants(props.session).map(merchant => ({
                    icon: <Store className="w-5 h-5" />,
                    label: merchant.name,
                    href: `/m/${merchant.slug}`
                })),
                ...(getUserMerchants(props.session).length > 0 ? [
                    {
                        type: "divider" as const,
                        label: ""
                    },
                    {
                        icon: <Settings className="w-5 h-5" />,
                        label: "Manage Linked Shops",
                        href: `/p/${practitionerSlug}/manage/shopfronts`
                    }
                ] : [])
            ],
        },
    ];

    const dialogMapping: Record<string, (onClose: () => void) => JSX.Element> = !isNullOrUndefined(practitioner)
        ? {
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
            "Edit Socials": () => <EditPractitionerSocials practitionerId={practitionerId} />,
            "Edit Audio Intro": () => <EditPractitionerAudioIntro practitionerId={practitionerId} />,
            "Edit Oracle Message": () => <EditPractitionerOracleMessage practitionerId={practitionerId} />,
            "Edit Pinned Reviews": () => <EditPractitionerPinnedTestimonials practitionerId={practitionerId} />,
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
