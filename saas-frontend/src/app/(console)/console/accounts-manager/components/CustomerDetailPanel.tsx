'use client';

import { ConsoleCustomerAccount } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { X, User, Mail, ShoppingBag, Store, Sparkles, Eye, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import AccountNotes from './AccountNotes';
import { usePurgeCustomerAccount } from '../hooks/UseCustomerQuickActions';

interface CustomerDetailPanelProps {
    customer: ConsoleCustomerAccount;
    onClose: () => void;
}

export default function CustomerDetailPanel({ customer, onClose }: CustomerDetailPanelProps) {
    const [isImpersonating, setIsImpersonating] = useState(false);
    const [showPurgeDialog, setShowPurgeDialog] = useState(false);
    const [purgeConfirmEmail, setPurgeConfirmEmail] = useState('');
    const purgeCustomer = usePurgeCustomerAccount();

    const handleViewAs = async () => {
        if (!customer.email) return;
        setIsImpersonating(true);
        try {
            const res = await fetch('/api/console/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: customer.email }),
            });
            if (res.ok) {
                window.open('/', '_blank');
            }
        } finally {
            setIsImpersonating(false);
        }
    };

    const handlePurge = async () => {
        try {
            const result = await purgeCustomer.mutateAsync({
                userId: customer.id,
                confirmEmail: purgeConfirmEmail,
            });
            if (result.success) {
                toast.success(result.message);
                setShowPurgeDialog(false);
                setPurgeConfirmEmail('');
                onClose();
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error('Failed to purge customer account');
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800" data-testid="customer-detail-panel">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-sm font-medium text-white">
                            {customer.firstname} {customer.lastname}
                        </h2>
                        <p className="text-xs text-slate-400">{customer.email}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white" data-testid="close-customer-detail">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Contact */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">Contact</h3>
                    <div className="bg-slate-800 p-3 rounded-lg space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-white">{customer.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">ID:</span>
                            <span className="text-white font-mono text-xs">{customer.id}</span>
                        </div>
                        {customer.createdDate && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Joined:</span>
                                <span className="text-white">
                                    {formatDistanceToNow(new Date(customer.createdDate), { addSuffix: true })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Notes */}
                <AccountNotes
                    accountId={customer.id}
                    accountType="customer"
                    notes={customer.adminNotes || []}
                />

                {/* View As */}
                {customer.email && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white flex items-center">
                            <Eye className="h-4 w-4 mr-2 text-indigo-400" />
                            Impersonate
                        </h3>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                            onClick={handleViewAs}
                            disabled={isImpersonating}
                            data-testid="view-as-customer-btn"
                        >
                            {isImpersonating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Opening...
                                </>
                            ) : (
                                <>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View As {customer.email}
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Activity */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-white">Activity</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-800 p-3 rounded-lg">
                            <div className="flex items-center space-x-2 mb-1">
                                <Store className="h-4 w-4 text-indigo-400" />
                                <span className="text-xs text-slate-400">Vendors</span>
                            </div>
                            <p className="text-xl font-bold text-white">{customer.vendorCount}</p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-lg">
                            <div className="flex items-center space-x-2 mb-1">
                                <ShoppingBag className="h-4 w-4 text-green-400" />
                                <span className="text-xs text-slate-400">Orders</span>
                            </div>
                            <p className="text-xl font-bold text-white">{customer.orderCount}</p>
                        </div>
                    </div>
                </div>

                {/* Spiritual Interests */}
                {customer.spiritualInterests && customer.spiritualInterests.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white flex items-center">
                            <Sparkles className="h-4 w-4 mr-2 text-purple-400" />
                            Spiritual Interests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {customer.spiritualInterests.map((interest) => (
                                <span
                                    key={interest}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                >
                                    {interest}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Danger Zone */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-red-400 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Danger Zone
                    </h3>
                    <div className="border border-red-500/20 rounded-lg p-4 space-y-3">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => setShowPurgeDialog(true)}
                            data-testid="purge-customer-btn"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Purge Account
                        </Button>
                    </div>
                </div>
            </div>

            {/* Purge Confirmation Dialog */}
            <Dialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog} data-testid="purge-customer-dialog">
                <DialogContent className="sm:max-w-md max-w-[95vw]" data-testid="purge-customer-dialog-content">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2 text-red-400">
                            <Trash2 className="h-5 w-5" />
                            <span>Purge Customer Account</span>
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            This will permanently delete all data for <span className="font-semibold text-white">{customer.email}</span>. This action cannot be undone. All owned vendors, orders, bookings, cases, reviews, follows, messages, saved cart, reading requests and Stripe customer records will be removed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-sm text-slate-300">
                                Type the customer email to confirm
                            </Label>
                            <Input
                                data-testid="purge-customer-confirm-email-input"
                                value={purgeConfirmEmail}
                                onChange={(e) => setPurgeConfirmEmail(e.target.value)}
                                placeholder={customer.email}
                                dark
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <Button
                                data-testid="purge-customer-confirm-btn"
                                onClick={handlePurge}
                                disabled={purgeConfirmEmail !== customer.email || purgeCustomer.isPending}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                                {purgeCustomer.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Purging...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Permanently Delete All Data
                                    </>
                                )}
                            </Button>
                            <Button
                                data-testid="purge-customer-cancel-btn"
                                variant="outline"
                                onClick={() => {
                                    setShowPurgeDialog(false);
                                    setPurgeConfirmEmail('');
                                }}
                                className="w-full"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
