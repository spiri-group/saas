'use client'

import React, { useState } from "react"
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus, Sparkles, Heart, MessageCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import UseMerchantServices from "./hooks/UseMerchantServices";
import WithPaymentsEnabled from "../../../../_components/Banking/_components/WithPaymentsEnabled";
import CreateReading from "./_components/CreateReading";
import CreateHealing from "./_components/CreateHealing";
import CreateCoaching from "./_components/CreateCoaching";

type ServiceDialogType = 'reading' | 'healing' | 'coaching' | null;

type Props = {
    merchantId: string
}

const UI: React.FC<Props> = ({ merchantId }) => {
    const params = useParams();
    const merchantSlug = params.merchant_slug as string;
    const servicesQuery = UseMerchantServices(merchantId);
    const [createDialog, setCreateDialog] = useState<ServiceDialogType>(null);

    const services = servicesQuery.data ?? [];

    return (
        <div className="p-4 md:p-6 w-full">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                        <BookOpen className="w-6 h-6 text-purple-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white" data-testid="services-page-title">My Services</h1>
                </div>
                <p className="text-slate-400">
                    Create and manage your service offerings
                </p>
            </div>

            {/* Create New Service Section */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Create New Service</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card
                        className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer"
                        onClick={() => setCreateDialog('reading')}
                        data-testid="create-service-reading-card"
                    >
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-lg">Reading</CardTitle>
                                    <CardDescription className="text-slate-400">Tarot, oracle, or psychic readings</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Button
                                variant="outline"
                                className="w-full bg-transparent border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                                data-testid="create-service-reading-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Reading
                            </Button>
                        </CardContent>
                    </Card>

                    <Card
                        className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer"
                        onClick={() => setCreateDialog('healing')}
                        data-testid="create-service-healing-card"
                    >
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20 text-green-400">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-lg">Healing</CardTitle>
                                    <CardDescription className="text-slate-400">Reiki, energy healing, or sound therapy</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Button
                                variant="outline"
                                className="w-full bg-transparent border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                                data-testid="create-service-healing-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Healing
                            </Button>
                        </CardContent>
                    </Card>

                    <Card
                        className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer"
                        onClick={() => setCreateDialog('coaching')}
                        data-testid="create-service-coaching-card"
                    >
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                    <MessageCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white text-lg">Coaching</CardTitle>
                                    <CardDescription className="text-slate-400">Spiritual or life coaching sessions</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Button
                                variant="outline"
                                className="w-full bg-transparent border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
                                data-testid="create-service-coaching-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Coaching
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Active Services */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Your Active Services</h2>
                {servicesQuery.isLoading ? (
                    <Card className="bg-slate-800/30 border-slate-700/50">
                        <CardContent className="flex items-center justify-center py-12">
                            <p className="text-slate-400">Loading services...</p>
                        </CardContent>
                    </Card>
                ) : services.length === 0 ? (
                    <Card className="bg-slate-800/30 border-slate-700/50">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <BookOpen className="w-12 h-12 text-slate-600 mb-4" />
                            <p className="text-slate-400 mb-2">No services created yet</p>
                            <p className="text-slate-500 text-sm">
                                Create your first service offering above to get started
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {services.map((service) => (
                            <Link
                                key={service.id}
                                href={`/m/${merchantSlug}/manage/services/${service.id}`}
                                data-testid={`service-card-${service.id}`}
                            >
                                <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer h-full">
                                    <CardHeader>
                                        <CardTitle className="text-white">{service.name}</CardTitle>
                                    </CardHeader>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Service Dialogs */}
            {/* CreateReading renders its own DialogContent */}
            <Dialog open={createDialog === 'reading'} onOpenChange={(open) => !open && setCreateDialog(null)}>
                <CreateReading merchantId={merchantId} />
            </Dialog>

            <Dialog open={createDialog === 'healing'} onOpenChange={(open) => !open && setCreateDialog(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <CreateHealing merchantId={merchantId} />
                </DialogContent>
            </Dialog>

            <Dialog open={createDialog === 'coaching'} onOpenChange={(open) => !open && setCreateDialog(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <CreateCoaching merchantId={merchantId} />
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Services don't require physical locations
export default WithPaymentsEnabled(UI, { requireLocations: false });
