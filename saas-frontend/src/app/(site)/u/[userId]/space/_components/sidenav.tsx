'use client';

import { useParams } from "next/navigation";
import SideNav, { NavOption } from "@/components/ui/sidenav";
import { JSX, useMemo } from "react";
import { Sparkles, Moon, Home, Send, Inbox, Wind, Gem, Star, Droplets, Grid3X3, BookOpen, Zap, Activity, Users, BookHeart, Cross, Heart, MessageCircle, Dumbbell, BookMarked, Layers, LibraryBig, Sun, Orbit, Package, CalendarDays, User } from "lucide-react";
import UseUserProfile from "@/hooks/user/UseUserProfile";
import { SpiritualInterest } from "@/app/(site)/u/[userId]/onboarding/types";
import { useUnlockStatusForInterest } from "../_hooks/useUnlockStatus";
import { useVocab } from "../_hooks/useVocab";
import { SpiriReadingsWizard } from "../readings/request/components";
// Form components for dialogs
import { SynchronicityForm } from "../mediumship/synchronicities/components/SynchronicityForm";
import { SpiritMessageForm } from "../mediumship/spirit-messages/components/SpiritMessageForm";
import { ReflectionForm } from "../mediumship/reflections/components/ReflectionForm";
import DreamForm from "../journal/dreams/components/DreamForm";
import MeditationForm from "../journal/meditation/components/MeditationForm";
import CardPullForm from "../readings/card-pulls/components/CardPullForm";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
const useBL = () => {
    const params = useParams();
    if (params == null) throw new Error("params is null");

    const userId = params.userId as string;
    const { data: user } = UseUserProfile(userId);
    const mediumshipUnlocks = useUnlockStatusForInterest(userId, 'mediumship');
    const { vocab } = useVocab(userId);

    // Get all user interests (primary + secondary)
    const userInterests = useMemo(() => {
        const interests: SpiritualInterest[] = [];
        if (user?.primarySpiritualInterest) {
            interests.push(user.primarySpiritualInterest as SpiritualInterest);
        }
        if (user?.secondarySpiritualInterests) {
            interests.push(...(user.secondarySpiritualInterests as SpiritualInterest[]));
        }
        return interests;
    }, [user?.primarySpiritualInterest, user?.secondarySpiritualInterests]);

    // Build navigation options based on user's interests
    const options = useMemo(() => {
        // Helper to check if user has a specific interest
        const hasInterest = (interest: SpiritualInterest) => userInterests.includes(interest);

        const navOptions: NavOption[] = [
            {
                label: "Home",
                href: `/u/${userId}/space`,
                icon: <Home className="w-5 h-5" />
            },
            {
                icon: <MessageCircle className="w-5 h-5" />,
                label: "Messages",
                href: `/u/${userId}/space/messages`,
                testId: "messages-nav"
            },
            {
                type: "divider",
                label: ""
            }
        ];

        // Journal section - build dynamically based on interests
        // This is an expandable nav item (not a navgroup) so user clicks to see journal types
        const journalNavOptions: NavOption[] = [];

        // Crystal Journal - for CRYSTALS interest
        if (hasInterest('CRYSTALS')) {
            journalNavOptions.push({
                icon: <Gem className="w-5 h-5" />,
                label: "Crystal",
                href: `/u/${userId}/space/journal/crystal`
            });
        }

        // Dreams, Tarot, and Astrology Journal - for MEDIUMSHIP interest
        if (hasInterest('MEDIUMSHIP')) {
            journalNavOptions.push({
                icon: <Moon className="w-5 h-5" />,
                label: "Dreams",
                href: `/u/${userId}/space/journal/dreams`
            });
            journalNavOptions.push({
                icon: <Layers className="w-5 h-5" />,
                label: "Tarot",
                href: `/u/${userId}/space/journal/card-pull`
            });
            journalNavOptions.push({
                icon: <Star className="w-5 h-5" />,
                label: "Astrology",
                href: `/u/${userId}/space/astrology/journal`,
                testId: "journal-astrology-nav"
            });
        }

        // Energy Journals - for ENERGY interest
        if (hasInterest('ENERGY')) {
            journalNavOptions.push({
                icon: <Wind className="w-5 h-5" />,
                label: "Meditation",
                href: `/u/${userId}/space/journal/meditation`
            });
            journalNavOptions.push({
                icon: <Zap className="w-5 h-5" />,
                label: "Energy",
                href: `/u/${userId}/space/energy/journal`
            });
        }

        // Only add Journal as expandable item if there are journal types
        if (journalNavOptions.length > 0) {
            navOptions.push({
                icon: <BookOpen className="w-5 h-5" />,
                label: "Journal",
                navOptions: journalNavOptions,
                testId: "journal-nav"
            });
        }

        // Readings section - shown for MEDIUMSHIP interest
        if (hasInterest('MEDIUMSHIP')) {
            navOptions.push({
                icon: <Inbox className="w-5 h-5" />,
                label: "Readings",
                navOptions: [
                    {
                        icon: <Send className="w-5 h-5" />,
                        label: "SpiriReading",
                        dialogId: "spiri-readings"
                    },
                    {
                        icon: <Inbox className="w-5 h-5" />,
                        label: "All Readings",
                        href: `/u/${userId}/space/readings/received`
                    },
                    {
                        icon: <BookMarked className="w-5 h-5" />,
                        label: "Reflections",
                        href: `/u/${userId}/space/mediumship/reflections`
                    }
                ]
            });

            // Mediumship Development section - with progressive unlocks
            const mediumshipNavOptions: NavOption[] = [];

            // Synchronicity Log - unlocks after 7 days active
            if (mediumshipUnlocks.isUnlocked('mediumship:synchronicity-log')) {
                mediumshipNavOptions.push({
                    icon: <Sparkles className="w-5 h-5" />,
                    label: "Synchronicity Log",
                    href: `/u/${userId}/space/mediumship/synchronicities`
                });
            }

            // Spirit Messages - unlocks after first Reading Reflection
            if (mediumshipUnlocks.isUnlocked('mediumship:spirit-messages')) {
                mediumshipNavOptions.push({
                    icon: <MessageCircle className="w-5 h-5" />,
                    label: vocab('spirit_messages'),
                    href: `/u/${userId}/space/mediumship/spirit-messages`
                });
            }

            // Loved Ones in Spirit - prompt-based (always show as it's optional)
            mediumshipNavOptions.push({
                icon: <Heart className="w-5 h-5" />,
                label: "Loved Ones",
                href: `/u/${userId}/space/mediumship/loved-ones`
            });

            // Development Exercises - unlocks after 30 days
            if (mediumshipUnlocks.isUnlocked('mediumship:development-exercises')) {
                mediumshipNavOptions.push({
                    icon: <Dumbbell className="w-5 h-5" />,
                    label: "Exercises",
                    href: `/u/${userId}/space/mediumship/exercises`
                });
            }

            // If only one child, link directly instead of showing a flyout
            if (mediumshipNavOptions.length === 1) {
                navOptions.push({
                    icon: <Sparkles className="w-5 h-5" />,
                    label: "Mediumship",
                    href: mediumshipNavOptions[0].href
                });
            } else {
                navOptions.push({
                    icon: <Sparkles className="w-5 h-5" />,
                    label: "Mediumship",
                    navOptions: mediumshipNavOptions
                });
            }

            // Tarot section - shown for MEDIUMSHIP interest
            navOptions.push({
                icon: <Layers className="w-5 h-5" />,
                label: "Tarot",
                navOptions: [
                    {
                        icon: <Sparkles className="w-5 h-5" />,
                        label: "Dashboard",
                        href: `/u/${userId}/space/symbols`
                    },
                    {
                        icon: <BookOpen className="w-5 h-5" />,
                        label: "Dictionary",
                        href: `/u/${userId}/space/symbols/dictionary`
                    },
                    {
                        icon: <LibraryBig className="w-5 h-5" />,
                        label: "My Symbols",
                        href: `/u/${userId}/space/symbols/my-card-symbols`
                    }
                ]
            });

            // Astrology section - shown for MEDIUMSHIP interest
            navOptions.push({
                icon: <Star className="w-5 h-5" />,
                label: "Astrology",
                navOptions: [
                    {
                        icon: <Sun className="w-5 h-5" />,
                        label: "My Birth Chart",
                        href: `/u/${userId}/space/astrology/birth-chart`
                    },
                    {
                        icon: <Orbit className="w-5 h-5" />,
                        label: "Transit Tracker",
                        href: `/u/${userId}/space/astrology/transits`
                    }
                ]
            });
        }

        // Energy section - shown for ENERGY interest
        if (hasInterest('ENERGY')) {
            navOptions.push({
                icon: <Zap className="w-5 h-5" />,
                label: "Energy",
                navOptions: [
                    {
                        icon: <Activity className="w-5 h-5" />,
                        label: "Chakra Check-In",
                        href: `/u/${userId}/space/energy/chakra`
                    },
                    {
                        icon: <Users className="w-5 h-5" />,
                        label: "Reflections",
                        href: `/u/${userId}/space/energy/sessions`
                    }
                ]
            });
        }

        // Crystals & Stones section - shown for CRYSTALS interest
        if (hasInterest('CRYSTALS')) {
            navOptions.push({
                icon: <Gem className="w-5 h-5" />,
                label: "Crystals",
                navOptions: [
                    {
                        icon: <BookOpen className="w-5 h-5" />,
                        label: "Crystal Guide",
                        href: `/u/${userId}/space/crystals/guide`,
                        testId: "crystal-guide-nav"
                    },
                    {
                        icon: <Sparkles className="w-5 h-5" />,
                        label: "Daily Companion",
                        href: `/u/${userId}/space/crystals/companion`
                    },
                    {
                        icon: <Gem className="w-5 h-5" />,
                        label: "My Collection",
                        href: `/u/${userId}/space/crystals/collection`
                    },
                    {
                        icon: <Star className="w-5 h-5" />,
                        label: "Wishlist",
                        href: `/u/${userId}/space/crystals/wishlist`
                    },
                    {
                        icon: <Droplets className="w-5 h-5" />,
                        label: "Cleansing History",
                        href: `/u/${userId}/space/crystals/cleansing`
                    },
                    {
                        icon: <Grid3X3 className="w-5 h-5" />,
                        label: "Crystal Grids",
                        href: `/u/${userId}/space/crystals/grids`
                    }
                ]
            });
        }

        // Faith section - shown for FAITH interest
        if (hasInterest('FAITH')) {
            navOptions.push({
                icon: <Cross className="w-5 h-5" />,
                label: "Faith",
                navOptions: [
                    {
                        icon: <Heart className="w-5 h-5" />,
                        label: "Daily Passage",
                        href: `/u/${userId}/space/faith/daily`
                    },
                    {
                        icon: <BookHeart className="w-5 h-5" />,
                        label: "Prayer Journal",
                        href: `/u/${userId}/space/faith/prayer`
                    },
                    {
                        icon: <Cross className="w-5 h-5" />,
                        label: "Scripture Reflections",
                        href: `/u/${userId}/space/faith/scripture`
                    }
                ]
            });
        }

        // ── Commerce & Account ──────────────────────────
        // Always visible regardless of spiritual interests
        navOptions.push({
            type: "divider",
            label: ""
        });

        navOptions.push({
            icon: <Package className="w-5 h-5" />,
            label: "Orders",
            href: `/u/${userId}/space/orders`,
            testId: "orders-nav"
        });

        navOptions.push({
            icon: <CalendarDays className="w-5 h-5" />,
            label: "Bookings",
            href: `/u/${userId}/space/bookings`,
            testId: "bookings-nav"
        });

        navOptions.push({
            icon: <User className="w-5 h-5" />,
            label: "Account",
            href: `/u/${userId}/space/account`,
            testId: "account-nav"
        });

        return navOptions;
    }, [userId, userInterests, mediumshipUnlocks, vocab]);

    const dialogMapping: Record<string, (onClose: () => void) => JSX.Element> = {
        "spiri-readings": (onClose: () => void) => (
            <SpiriReadingsWizard userId={userId} onClose={onClose} />
        ),
        "synchronicity": (onClose: () => void) => (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Log Synchronicity
                    </DialogTitle>
                </DialogHeader>
                <SynchronicityForm userId={userId} onSuccess={onClose} />
            </>
        ),
        "spirit-message": (onClose: () => void) => (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-indigo-400" />
                        {vocab('record_spirit_message')}
                    </DialogTitle>
                </DialogHeader>
                <SpiritMessageForm userId={userId} onSuccess={onClose} />
            </>
        ),
        "reflection": (onClose: () => void) => (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookMarked className="w-5 h-5 text-violet-400" />
                        Add Reading Reflection
                    </DialogTitle>
                </DialogHeader>
                <ReflectionForm userId={userId} onSuccess={onClose} />
            </>
        ),
        "dream": (onClose: () => void) => (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Moon className="w-5 h-5 text-indigo-400" />
                        Record Dream
                    </DialogTitle>
                </DialogHeader>
                <DreamForm userId={userId} onSuccess={onClose} />
            </>
        ),
        "meditation": (onClose: () => void) => (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wind className="w-5 h-5 text-teal-400" />
                        Log Meditation
                    </DialogTitle>
                </DialogHeader>
                <MeditationForm userId={userId} onSuccess={onClose} />
            </>
        ),
        "card-pull": (onClose: () => void) => (
            <>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-violet-400" />
                        Log Card Pull
                    </DialogTitle>
                </DialogHeader>
                <CardPullForm userId={userId} onSuccess={onClose} />
            </>
        )
    };

    const renderDialog = (dialogKey: string, onClose: () => void): JSX.Element => {
        const DialogComponent = dialogMapping[dialogKey];
        return DialogComponent ? DialogComponent(onClose) : <></>;
    };

    return {
        options: {
            get: options
        },
        renderDialog
    };
};

const PersonalSpaceSideNav: React.FC = () => {
    const bl = useBL();

    return (
        <SideNav
            aria-label="personal-space-side-nav"
            className="mt-2"
            navOptions={bl.options.get}
            renderDialog={bl.renderDialog}
        />
    );
};

export default PersonalSpaceSideNav;
