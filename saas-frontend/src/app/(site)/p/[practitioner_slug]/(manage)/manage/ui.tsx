'use client'

import React from "react";
import { Session } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    Sparkles,
    Heart,
    MessageCircle,
    Calendar,
    Clock,
    ChevronRight,
    Star,
    ExternalLink,
    Plus,
    UserCog
} from "lucide-react";
import Link from "next/link";
import PractitionerSideNav from "../../../_components/PractitionerSideNav";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

const DashboardCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    count?: number;
    actionLabel?: string;
}> = ({ title, description, icon, href, count, actionLabel = "View" }) => (
    <Link href={href}>
        <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer group">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                        {icon}
                    </div>
                    {count !== undefined && (
                        <span className="text-2xl font-bold text-white">{count}</span>
                    )}
                </div>
                <CardTitle className="text-white text-lg mt-2">{title}</CardTitle>
                <CardDescription className="text-slate-400">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center text-purple-400 text-sm group-hover:text-purple-300 transition-colors">
                    {actionLabel}
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
            </CardContent>
        </Card>
    </Link>
);

const QuickAction: React.FC<{
    label: string;
    icon: React.ReactNode;
    dialogId: string;
}> = ({ label, icon, dialogId }) => {
    const handleClick = () => {
        const event = new CustomEvent("open-nav-external", {
            detail: {
                path: [label],
                action: {
                    type: "dialog",
                    dialog: dialogId
                }
            }
        });
        window.dispatchEvent(event);
    };

    return (
        <Button
            variant="outline"
            className="flex items-center gap-2 bg-slate-800/50 border-slate-700 text-white hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-300"
            onClick={handleClick}
        >
            {icon}
            {label}
        </Button>
    );
};

// Card that opens a sidenav submenu when clicked
const ProfileActionCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    menuLabel: string;
    actionLabel?: string;
}> = ({ title, description, icon, menuLabel, actionLabel = "Customize" }) => {
    const handleClick = () => {
        const event = new CustomEvent("open-nav-external", {
            detail: {
                path: [menuLabel],
                action: {
                    type: "expand"
                }
            }
        });
        window.dispatchEvent(event);
    };

    return (
        <Card
            className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/30 hover:border-purple-400/50 transition-all cursor-pointer group"
            onClick={handleClick}
        >
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-purple-500/30 text-purple-300">
                        {icon}
                    </div>
                </div>
                <CardTitle className="text-white text-lg mt-2">{title}</CardTitle>
                <CardDescription className="text-slate-300">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center text-purple-300 text-sm group-hover:text-purple-200 transition-colors">
                    {actionLabel}
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
            </CardContent>
        </Card>
    );
};

export default function PractitionerDashboard({ session, practitionerId, slug }: Props) {
    const practitioner = session.user.vendors?.find(v => v.id === practitionerId);

    return (
        <div className="flex min-h-full">
            {/* Sidebar */}
            <PractitionerSideNav
                session={session}
                practitionerId={practitionerId}
                practitionerSlug={slug}
            />

            {/* Main Content */}
            <div className="flex-1 md:ml-[200px] p-4 md:p-6">
                <div className="w-full">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                                <LayoutDashboard className="w-6 h-6 text-purple-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">
                                Welcome back{practitioner?.name ? `, ${practitioner.name}` : ''}!
                            </h1>
                        </div>
                        <p className="text-slate-400">
                            Manage your services, bookings, and reading requests
                        </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                        <div className="flex flex-wrap gap-3">
                            <QuickAction
                                label="New Reading"
                                icon={<Sparkles className="w-4 h-4" />}
                                dialogId="Create Reading"
                            />
                            <QuickAction
                                label="New Healing"
                                icon={<Heart className="w-4 h-4" />}
                                dialogId="Create Healing"
                            />
                            <QuickAction
                                label="New Coaching"
                                icon={<MessageCircle className="w-4 h-4" />}
                                dialogId="Create Coaching"
                            />
                            <Link href={`/p/${slug}`} target="_blank">
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2 bg-slate-800/50 border-slate-700 text-white hover:bg-purple-500/20 hover:border-purple-500/50 hover:text-purple-300"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Public Profile
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Dashboard Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        <ProfileActionCard
                            title="Customize Your Profile"
                            description="Update your bio, modalities, tools, and more"
                            icon={<UserCog className="w-5 h-5" />}
                            menuLabel="Profile"
                            actionLabel="Customize"
                        />

                        <DashboardCard
                            title="Reading Requests"
                            description="View and claim reading requests from customers"
                            icon={<Sparkles className="w-5 h-5" />}
                            href={`/p/${slug}/manage/readings`}
                            actionLabel="View Requests"
                        />

                        <DashboardCard
                            title="My Services"
                            description="Manage your service offerings"
                            icon={<Plus className="w-5 h-5" />}
                            href={`/p/${slug}/manage/services`}
                            actionLabel="Manage Services"
                        />

                        <DashboardCard
                            title="Upcoming Bookings"
                            description="View your scheduled sessions"
                            icon={<Calendar className="w-5 h-5" />}
                            href={`/p/${slug}/manage/bookings`}
                            actionLabel="View Bookings"
                        />

                        <DashboardCard
                            title="Availability"
                            description="Set your working hours and availability"
                            icon={<Clock className="w-5 h-5" />}
                            href={`/p/${slug}/manage/availability`}
                            actionLabel="Set Schedule"
                        />

                        <DashboardCard
                            title="Reviews"
                            description="See what your clients are saying"
                            icon={<Star className="w-5 h-5" />}
                            href={`/p/${slug}/manage/profile`}
                            actionLabel="View Reviews"
                        />
                    </div>

                    {/* Getting Started Section */}
                    <Card className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/30">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                                Getting Started
                            </CardTitle>
                            <CardDescription className="text-slate-300">
                                Set up your practitioner profile to start receiving bookings
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-3 text-sm text-slate-300">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-medium">1</span>
                                    <span>Create your first service offering (reading, healing, or coaching session)</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-medium">2</span>
                                    <span>Set your availability hours so clients can book sessions</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-300 text-xs font-medium">3</span>
                                    <span>Browse the SpiriReadings request bank to claim and fulfill reading requests</span>
                                </li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
