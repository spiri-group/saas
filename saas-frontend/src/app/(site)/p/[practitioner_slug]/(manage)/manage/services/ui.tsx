'use client'

import React from "react";
import { Session } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Heart, MessageCircle, Plus } from "lucide-react";
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

const CreateServiceButton: React.FC<{
    label: string;
    description: string;
    icon: React.ReactNode;
    dialogId: string;
}> = ({ label, description, icon, dialogId }) => {
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
        <Card
            className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer group"
            onClick={handleClick}
            data-testid={`create-service-${label.toLowerCase()}-card`}
        >
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                        {icon}
                    </div>
                    <div>
                        <CardTitle className="text-white text-lg">{label}</CardTitle>
                        <CardDescription className="text-slate-400">{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Button
                    variant="outline"
                    className="w-full bg-transparent border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                    data-testid={`create-service-${label.toLowerCase()}-btn`}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create {label}
                </Button>
            </CardContent>
        </Card>
    );
};

export default function PractitionerServicesUI({ session, practitionerId, slug }: Props) {
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
                                <BookOpen className="w-6 h-6 text-purple-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">My Services</h1>
                        </div>
                        <p className="text-slate-400">
                            Create and manage your service offerings
                        </p>
                    </div>

                    {/* Create New Service Section */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Create New Service</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <CreateServiceButton
                                label="Reading"
                                description="Tarot, oracle, or psychic readings"
                                icon={<Sparkles className="w-5 h-5" />}
                                dialogId="Create Reading"
                            />
                            <CreateServiceButton
                                label="Healing"
                                description="Reiki, energy healing, or sound therapy"
                                icon={<Heart className="w-5 h-5" />}
                                dialogId="Create Healing"
                            />
                            <CreateServiceButton
                                label="Coaching"
                                description="Spiritual or life coaching sessions"
                                icon={<MessageCircle className="w-5 h-5" />}
                                dialogId="Create Coaching"
                            />
                        </div>
                    </div>

                    {/* Active Services Section - Placeholder for future implementation */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold text-white mb-4">Your Active Services</h2>
                        <Card className="bg-slate-800/30 border-slate-700/50">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
                                <p className="text-slate-400 mb-2">No services created yet</p>
                                <p className="text-slate-500 text-sm">
                                    Create your first service offering to start receiving bookings
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
