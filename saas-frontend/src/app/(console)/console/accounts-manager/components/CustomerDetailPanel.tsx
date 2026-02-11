'use client';

import { ConsoleCustomerAccount } from '../types';
import { Button } from '@/components/ui/button';
import { X, User, Mail, ShoppingBag, Store, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CustomerDetailPanelProps {
    customer: ConsoleCustomerAccount;
    onClose: () => void;
}

export default function CustomerDetailPanel({ customer, onClose }: CustomerDetailPanelProps) {
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
            </div>
        </div>
    );
}
