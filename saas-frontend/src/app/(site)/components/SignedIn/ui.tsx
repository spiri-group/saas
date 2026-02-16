'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Store, Sparkles, Settings, LogOut, PencilLine, Plus, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import BouncingDots from "@/icons/BouncingDots";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { VendorDocType } from "@/utils/spiriverse";

function getInitials(email: string): string {
    const local = email.split('@')[0] ?? '';
    if (local.includes('.')) {
        const parts = local.split('.');
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
}

const UI: React.FC<{ user: { email: string; id: string } }> = ({ user: { email, id } }) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const initials = getInitials(email);

    const handleSignOut = async () => {
        try {
            await signOut({ callbackUrl: '/' });
            queryClient.invalidateQueries({
                queryKey: ['user-me-contact', 'user-me-nav', 'setup-me'],
            });
        } catch (error) {
            console.error("Error during sign-out:", error);
        }
    };

    const merchants = session?.user?.vendors?.filter(v => v.docType === VendorDocType.MERCHANT || !v.docType) ?? [];
    const practitioners = session?.user?.vendors?.filter(v => v.docType === VendorDocType.PRACTITIONER) ?? [];

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger
                    data-testid="user-menu-trigger"
                    className="flex items-center justify-center w-9 h-9 mr-2 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/30 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    aria-label="User account menu"
                    onMouseEnter={() => setMenuOpen(true)}
                >
                    {initials}
                </DropdownMenuTrigger>
                {status === "loading" && (
                    <DropdownMenuContent className="w-72 bg-slate-950/95 backdrop-blur-xl border border-white/10">
                        <div className="flex items-center justify-center p-4">
                            <BouncingDots />
                        </div>
                    </DropdownMenuContent>
                )}
                {session?.user && (
                    <DropdownMenuContent
                        align="end"
                        data-testid="user-menu-dropdown"
                        className="w-72 bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-0"
                    >
                        {/* Header card */}
                        <div data-testid="user-menu-header" className="flex items-center gap-3 px-4 py-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-semibold shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm text-white/90 truncate">{email}</p>
                                <p className="text-xs text-slate-400">Customer Account</p>
                            </div>
                        </div>

                        <DropdownMenuSeparator className="bg-white/10" />

                        {/* Customer quick link */}
                        <div className="py-1">
                            <DropdownMenuItem
                                data-testid="user-menu-space"
                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                onClick={() => router.push(`/u/${id}/space`)}
                            >
                                <Sparkles className="w-4 h-4 mr-3 text-amber-400" />
                                My Space
                            </DropdownMenuItem>
                        </div>

                        {/* Merchants section */}
                        {merchants.length > 0 && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <div className="py-1">
                                    {merchants.map((vendor) => (
                                        <div key={vendor.id}>
                                            <p className="px-4 pt-2 pb-1 text-[10px] text-amber-300/50 uppercase tracking-wider font-medium">
                                                {vendor.name}
                                            </p>
                                            <DropdownMenuItem
                                                data-testid={`user-menu-merchant-${vendor.slug}`}
                                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                                onClick={() => router.push(`/m/${vendor.slug}`)}
                                            >
                                                <Store className="w-4 h-4 mr-3 text-amber-400" />
                                                Shop Page
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                data-testid={`user-menu-merchant-dashboard-${vendor.slug}`}
                                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                                onClick={() => router.push(`/m/${vendor.slug}/manage`)}
                                            >
                                                <LayoutDashboard className="w-4 h-4 mr-3 text-amber-400" />
                                                Dashboard
                                            </DropdownMenuItem>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Practitioners section */}
                        {practitioners.length > 0 && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <div className="py-1">
                                    {practitioners.map((practitioner) => (
                                        <div key={practitioner.id}>
                                            <p className="px-4 pt-2 pb-1 text-[10px] text-amber-300/50 uppercase tracking-wider font-medium">
                                                {practitioner.name}
                                            </p>
                                            <DropdownMenuItem
                                                data-testid={`user-menu-practitioner-${practitioner.slug}`}
                                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                                onClick={() => router.push(`/p/${practitioner.slug}`)}
                                            >
                                                <Sparkles className="w-4 h-4 mr-3 text-amber-400" />
                                                Profile Page
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                data-testid={`user-menu-practitioner-dashboard-${practitioner.slug}`}
                                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                                onClick={() => router.push(`/p/${practitioner.slug}/manage`)}
                                            >
                                                <LayoutDashboard className="w-4 h-4 mr-3 text-amber-400" />
                                                Dashboard
                                            </DropdownMenuItem>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Become CTAs */}
                        {(merchants.length === 0 || practitioners.length === 0) && (
                            <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <div className="py-1">
                                    {merchants.length === 0 && (
                                        <DropdownMenuItem
                                            data-testid="user-menu-become-merchant"
                                            className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                            onClick={() => {
                                                if (session.user && session.user.requiresInput) {
                                                    setShowProfileDialog(true);
                                                } else {
                                                    router.push('/m/setup');
                                                }
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-3 text-amber-400" />
                                            Open a Shop
                                        </DropdownMenuItem>
                                    )}
                                    {practitioners.length === 0 && (
                                        <DropdownMenuItem
                                            data-testid="user-menu-become-practitioner"
                                            className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                            onClick={() => {
                                                if (session.user && session.user.requiresInput) {
                                                    setShowProfileDialog(true);
                                                } else {
                                                    router.push('/p/setup');
                                                }
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-3 text-amber-400" />
                                            Start Practising
                                        </DropdownMenuItem>
                                    )}
                                </div>
                            </>
                        )}

                        <DropdownMenuSeparator className="bg-white/10" />

                        {/* Account Settings & Sign Out */}
                        <div className="py-1">
                            <DropdownMenuItem
                                data-testid="user-menu-settings"
                                className="px-4 py-2 text-white/90 hover:bg-amber-500/10 focus:bg-amber-500/10 focus:text-white/90 cursor-pointer"
                                onClick={() => router.push(`/u/${id}/space/account`)}
                            >
                                <Settings className="w-4 h-4 mr-3 text-amber-400" />
                                Account Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                data-testid="user-menu-sign-out"
                                className="px-4 py-2 text-white/90 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4 mr-3 text-amber-400" />
                                Sign Out
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                )}
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
    );
};

export default UI;
