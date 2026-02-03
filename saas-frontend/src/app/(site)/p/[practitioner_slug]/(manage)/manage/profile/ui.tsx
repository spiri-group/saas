'use client'

import React from "react";
import { Session } from "next-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, ExternalLink, Star } from "lucide-react";
import Link from "next/link";
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
}

export default function PractitionerProfileUI({ session, practitionerId, slug }: Props) {
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                    <User className="w-6 h-6 text-purple-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">Profile</h1>
                                    <p className="text-slate-400">
                                        Manage your practitioner profile
                                    </p>
                                </div>
                            </div>
                            <Link href={`/p/${slug}`} target="_blank">
                                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Public Profile
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Profile Overview */}
                    <Card className="bg-slate-800/50 border-slate-700 mb-6">
                        <CardHeader>
                            <CardTitle className="text-white">Profile Overview</CardTitle>
                            <CardDescription className="text-slate-400">
                                Your public practitioner profile information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                                        <User className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">
                                            {practitioner?.name || 'Your Name'}
                                        </h3>
                                        <p className="text-slate-400 text-sm">
                                            {practitioner?.slug ? `spiriverse.com.au/p/${practitioner.slug}` : `spiriverse.com.au/p/${slug}`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reviews Section */}
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400" />
                                Reviews & Ratings
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                See what your clients are saying about your services
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Star className="w-12 h-12 text-slate-600 mb-4" />
                                <p className="text-slate-400 mb-2">No reviews yet</p>
                                <p className="text-slate-500 text-sm">
                                    Reviews from your clients will appear here
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
