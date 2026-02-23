'use client';

import React, { useState } from "react";
import { Session } from "next-auth";
import PractitionerSideNav from "../../../../_components/PractitionerSideNav";
import { useLinkedShopfronts, useLinkShopfront, useUnlinkShopfront } from "./_hooks/useLinkedShopfronts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Plus, Trash2, ExternalLink, Link2, Loader2, ArrowUpDown } from "lucide-react";
import { VendorDocType } from "@/utils/spiriverse";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
};

export default function PractitionerShopfrontsUI({ session, practitionerId, slug }: Props) {
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);

    const linkedShopfrontsQuery = useLinkedShopfronts(practitionerId);
    const linkMutation = useLinkShopfront();
    const unlinkMutation = useUnlinkShopfront();

    // Get user's merchants that aren't already linked
    const userMerchants = session.user.vendors?.filter(v =>
        v.docType === VendorDocType.MERCHANT || !v.docType
    ) || [];

    const linkedIds = linkedShopfrontsQuery.data?.map(s => s.merchantId) || [];
    const availableToLink = userMerchants.filter(m => !linkedIds.includes(m.id));

    const handleLink = async (merchantId: string) => {
        await linkMutation.mutateAsync({ practitionerId, merchantId });
        setLinkDialogOpen(false);
    };

    const handleUnlink = async (merchantId: string) => {
        await unlinkMutation.mutateAsync({ practitionerId, merchantId });
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
            <PractitionerSideNav
                session={session}
                practitionerId={practitionerId}
                practitionerSlug={slug}
            />

            <main className="flex-1 p-6 md:p-8">
                <div className="w-full space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Store className="h-6 w-6 text-amber-500" />
                                My Shop Fronts
                            </h1>
                            <p className="text-slate-400 mt-1">
                                Link your merchant shops to display on your practitioner profile
                            </p>
                        </div>

                        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                            <DialogTrigger asChild>
                                <Button
                                    disabled={availableToLink.length === 0}
                                    data-testid="link-shopfront-btn"
                                >
                                    <Link2 className="h-4 w-4 mr-2" />
                                    Link a Shop
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Link a Shopfront</DialogTitle>
                                    <DialogDescription>
                                        Choose a shop to display on your practitioner profile
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 mt-4">
                                    {availableToLink.length === 0 ? (
                                        <div className="text-center py-6">
                                            <Store className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                            <p className="text-slate-400">No shops available to link</p>
                                            <Link href="/setup">
                                                <Button variant="outline" className="mt-4">
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Create a New Shop
                                                </Button>
                                            </Link>
                                        </div>
                                    ) : (
                                        availableToLink.map((merchant) => (
                                            <Card
                                                key={merchant.id}
                                                className="cursor-pointer hover:border-amber-500/50 transition-colors"
                                                onClick={() => handleLink(merchant.id)}
                                                data-testid={`link-merchant-${merchant.id}`}
                                            >
                                                <CardContent className="flex items-center justify-between p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                            <Store className="h-5 w-5 text-amber-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-white">{merchant.name}</p>
                                                            <p className="text-sm text-slate-400">/{merchant.slug}</p>
                                                        </div>
                                                    </div>
                                                    {linkMutation.isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                                                    ) : (
                                                        <Plus className="h-4 w-4 text-slate-400" />
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Linked Shopfronts */}
                    <Card className="border-slate-800 bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="text-lg text-white">Linked Shops</CardTitle>
                            <CardDescription>
                                These shops will be displayed on your practitioner profile
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {linkedShopfrontsQuery.isLoading || linkedShopfrontsQuery.isFetching ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                                </div>
                            ) : !linkedShopfrontsQuery.data || linkedShopfrontsQuery.data.length === 0 ? (
                                <div className="text-center py-8">
                                    <Store className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400 mb-4">No shops linked yet</p>
                                    <p className="text-sm text-slate-500 mb-4">
                                        Link your merchant shops to show products on your practitioner profile
                                    </p>
                                    {userMerchants.length === 0 ? (
                                        <Link href="/setup">
                                            <Button>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Your First Shop
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Button onClick={() => setLinkDialogOpen(true)} data-testid="link-first-shop-btn">
                                            <Link2 className="h-4 w-4 mr-2" />
                                            Link a Shop
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {linkedShopfrontsQuery.data
                                        ?.sort((a, b) => a.displayOrder - b.displayOrder)
                                        .map((shopfront, index) => (
                                            <div
                                                key={shopfront.merchantId}
                                                className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700"
                                                data-testid={`linked-shop-${shopfront.merchantId}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center h-8 w-8 rounded bg-slate-700 text-slate-400 text-sm font-medium">
                                                        {index + 1}
                                                    </div>
                                                    {shopfront.merchantLogo ? (
                                                        <img
                                                            src={shopfront.merchantLogo}
                                                            alt={shopfront.merchantName}
                                                            className="h-10 w-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                            <Store className="h-5 w-5 text-amber-500" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-white">{shopfront.merchantName}</p>
                                                        <p className="text-sm text-slate-400">/{shopfront.merchantSlug}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Link href={`/m/${shopfront.merchantSlug}`} target="_blank">
                                                        <Button variant="ghost" size="sm">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </Link>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                                data-testid={`unlink-shop-${shopfront.merchantId}`}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Unlink Shopfront?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will remove {shopfront.merchantName} from your practitioner profile.
                                                                    You can link it again later.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleUnlink(shopfront.merchantId)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                    data-testid="confirm-unlink-btn"
                                                                >
                                                                    {unlinkMutation.isPending ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        "Unlink"
                                                                    )}
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Help Text */}
                    <Card className="border-slate-800 bg-slate-900/30">
                        <CardContent className="p-4">
                            <div className="flex gap-3">
                                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                                    <ArrowUpDown className="h-4 w-4 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-300 font-medium">How it works</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Linked shops will appear on your practitioner profile, allowing clients to browse
                                        your products (like crystals) alongside your services. This creates a seamless
                                        experience for customers who want to book readings AND shop your offerings.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
