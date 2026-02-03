'use client';

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Briefcase, ChevronDown, PencilLine, User, CrownIcon, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { isNullOrUndefined } from "@/lib/functions";
import SpiriAssistLogo from "@/icons/spiri-assist-logo";
import BouncingDots from "@/icons/BouncingDots";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { VendorDocType } from "@/utils/spiriverse";

const UI : React.FC<{ user: {email: string, id: string }}> =
    ({ user: { email, id } }) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [showProfileDialog, setShowProfileDialog] = useState(false);

    return (
        <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex flex-row space-x-2 text-white"
                    aria-label="User account menu"
                    data-nav="user-menu"
                >
                    <span className="text-xs md:text-sm">{email}</span>
                    <ChevronDown aria-hidden="true" />
                </Button>
            </DropdownMenuTrigger>
            {status === "loading" && <DropdownMenuContent className="w-56 flex items-center justify-center">
                <BouncingDots />
            </DropdownMenuContent>}
            {session?.user &&
                <DropdownMenuContent className="w-56">
                    <DropdownMenuItem
                        onClick={() => { router.push(`/c/${id}`)}}
                        aria-label="button-customer-profile">
                        <User className="w-4 h-4 mr-2" />
                        <span>My profile</span>
                    </DropdownMenuItem>
                    {
                        !isNullOrUndefined(session.user.cases) && session.user.cases!.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="flex flex-row space-x-1">
                                    <SpiriAssistLogo height={16} />
                                    <span>SpiriAssist</span>
                                </DropdownMenuLabel>
                                <DropdownMenuGroup>
                                    {session.user.cases!.map((c) => (
                                        <DropdownMenuItem
                                            key={c.id}
                                            className="flex flex-row items-center space-x-2"
                                            onClick={() => { router.push(`/track/case/${c.id}`)}}
                                            aria-label={`button-case-${c.code}`}
                                        >
                                            <span className="flexnone">{c.code}</span>
                                            <span className="truncate">{c.location.formattedAddress}</span>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuGroup>
                            </>
                        )
                    }
                    <DropdownMenuSeparator />
                    {/* Merchants Section */}
                    {session.user.vendors?.filter(v => v.docType === VendorDocType.MERCHANT || !v.docType).map((vendor) => (
                        <div key={vendor.id}>
                            <DropdownMenuLabel>{vendor.name}</DropdownMenuLabel>
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    aria-label={`nav-merchant-profile-${vendor.name}`}
                                    onClick={() => {
                                        router.push(`/m/${vendor.slug}`);
                                    }}
                                >
                                    <Briefcase className="w-4 h-4 mr-2" />
                                    <span>Merchant Page</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    aria-label={`nav-spiriverse-plan-${vendor.name}`}
                                    onClick={() => {
                                        router.push(`/m/${vendor.slug}/subscription`);
                                    }}
                                >
                                    <CrownIcon className="w-4 h-4 mr-2" />
                                    <span>Spiriverse Plan</span>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </div>
                    ))}
                    {/* Start Merchant Creation if no merchants */}
                    {(!session.user.vendors || session.user.vendors.filter(v => v.docType === VendorDocType.MERCHANT || !v.docType).length === 0) && (
                        <DropdownMenuItem
                            aria-label="button-become-merchant"
                            onClick={() => {
                                if (session.user && session.user.requiresInput) {
                                    setShowProfileDialog(true);
                                } else {
                                    router.push(`/m/setup`);
                                }
                            }}
                        >
                            <Briefcase className="w-4 h-4 mr-2" />
                            <span>Become a Merchant</span>
                        </DropdownMenuItem>
                    )}
                    {/* Practitioners Section */}
                    {session.user.vendors?.filter(v => v.docType === VendorDocType.PRACTITIONER).map((practitioner) => (
                        <div key={practitioner.id}>
                            <DropdownMenuLabel>{practitioner.name}</DropdownMenuLabel>
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    aria-label={`nav-practitioner-dashboard-${practitioner.name}`}
                                    onClick={() => {
                                        router.push(`/p/${practitioner.slug}/manage`);
                                    }}
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    <span>Practitioner Dashboard</span>
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </div>
                    ))}
                    {/* Become a Practitioner if no practitioners */}
                    {(!session.user.vendors || session.user.vendors.filter(v => v.docType === VendorDocType.PRACTITIONER).length === 0) && (
                        <DropdownMenuItem
                            aria-label="button-become-practitioner"
                            onClick={() => {
                                if (session.user && session.user.requiresInput) {
                                    setShowProfileDialog(true);
                                } else {
                                    router.push(`/p/setup`);
                                }
                            }}
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            <span>Become a Practitioner</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            }
        </DropdownMenu>
        {showProfileDialog && (
            <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                <DialogContent className="sm:max-w-md rounded-2xl p-8 shadow-xl">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <PencilLine className="w-6 h-6 text-yellow-500" />
                        <DialogTitle className="text-xl font-bold">Complete your profile</DialogTitle>
                    </div>
                    <DialogDescription className="text-base text-gray-600 mt-2 leading-relaxed">
                        You must complete your profile before continuing. Please update your details to proceed.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-row gap-2 justify-end mt-6">
                    <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
                        Close
                    </Button>
                    <Button type="button" variant="default" onClick={() => {
                        if (typeof window !== "undefined" && window.location.pathname === `/u/${id}/setup`) {
                            window.location.reload();
                        } else {
                            router.push(`/u/${id}/setup`);
                        }
                    }}>
                        Go to profile setup
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        )}
        </>
    )
}

export default UI;