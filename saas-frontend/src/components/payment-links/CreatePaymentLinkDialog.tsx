'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Send } from 'lucide-react';
import { useCreatePaymentLink, CreatePaymentLinkInput } from '@/app/(site)/p/[practitioner_slug]/(manage)/manage/payment-links/_hooks/UseCreatePaymentLink';
import { toast } from 'sonner';

type ItemEntry = {
    id: string;
    vendorId: string;
    itemType: 'CUSTOM' | 'SERVICE' | 'PRODUCT';
    customDescription: string;
    sourceId?: string;
    amount: number;
    currency: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendors: { id: string; name: string; currency?: string }[];
};

const EXPIRATION_OPTIONS = [
    { value: '24', label: '24 hours' },
    { value: '48', label: '48 hours' },
    { value: '168', label: '7 days' },
    { value: '720', label: '30 days' },
];

export default function CreatePaymentLinkDialog({ open, onOpenChange, vendors }: Props) {
    const createMutation = useCreatePaymentLink();

    const defaultVendorId = vendors[0]?.id || '';
    const defaultCurrency = vendors[0]?.currency || 'AUD';

    const [customerEmail, setCustomerEmail] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [expirationHours, setExpirationHours] = useState('168');
    const [items, setItems] = useState<ItemEntry[]>([
        { id: crypto.randomUUID(), vendorId: defaultVendorId, itemType: 'CUSTOM', customDescription: '', amount: 0, currency: defaultCurrency },
    ]);

    const addItem = () => {
        setItems(prev => [
            ...prev,
            { id: crypto.randomUUID(), vendorId: defaultVendorId, itemType: 'CUSTOM', customDescription: '', amount: 0, currency: defaultCurrency },
        ]);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const updateItem = (id: string, updates: Partial<ItemEntry>) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const totalAmount = items.reduce((sum, i) => sum + (i.amount || 0), 0);

    const handleSubmit = async () => {
        if (!customerEmail.trim()) {
            toast.error('Customer email is required');
            return;
        }
        if (items.some(i => !i.amount || i.amount <= 0)) {
            toast.error('All items must have an amount greater than zero');
            return;
        }
        if (items.some(i => i.itemType === 'CUSTOM' && !i.customDescription.trim())) {
            toast.error('Custom items must have a description');
            return;
        }

        const input: CreatePaymentLinkInput = {
            customerEmail: customerEmail.trim(),
            customerName: customerName.trim() || undefined,
            expirationHours: parseInt(expirationHours),
            items: items.map(i => ({
                vendorId: i.vendorId,
                itemType: i.itemType,
                customDescription: i.itemType === 'CUSTOM' ? i.customDescription : undefined,
                sourceId: i.sourceId,
                amount: {
                    amount: Math.round(i.amount * 100), // convert dollars to cents
                    currency: i.currency,
                },
            })),
        };

        try {
            const result = await createMutation.mutateAsync(input);
            if (result.success) {
                // Copy URL to clipboard silently, then show one combined toast
                let description = `Sent to ${customerEmail}`;
                if (result.paymentUrl) {
                    await navigator.clipboard.writeText(result.paymentUrl).catch(() => {});
                    description += ' — link copied to clipboard';
                }
                toast.success(description ? `Payment link sent! ${description}` : 'Payment link sent!');
                onOpenChange(false);
                resetForm();
            } else {
                toast.error(result.message || 'Failed to create payment link');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to create payment link');
        }
    };

    const resetForm = () => {
        setCustomerEmail('');
        setCustomerName('');
        setExpirationHours('168');
        setItems([
            { id: crypto.randomUUID(), vendorId: defaultVendorId, itemType: 'CUSTOM', customDescription: '', amount: 0, currency: defaultCurrency },
        ]);
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto" data-testid="create-payment-link-dialog">
                <DialogHeader>
                    <DialogTitle data-testid="create-payment-link-title">Create Payment Link</DialogTitle>
                    <DialogDescription>Send a payment link to your client via email.</DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Customer Info */}
                    <div className="space-y-3">
                        <div>
                            <Label htmlFor="customer-email">Customer Email *</Label>
                            <Input
                                id="customer-email"
                                data-testid="payment-link-customer-email"
                                type="email"
                                placeholder="customer@example.com"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="customer-name">Customer Name</Label>
                            <Input
                                id="customer-name"
                                data-testid="payment-link-customer-name"
                                placeholder="Optional"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-3">
                        <Label>Items</Label>
                        {items.map((item, idx) => (
                            <div key={item.id} className="flex gap-2 items-start p-3 rounded-lg border border-slate-700 bg-slate-800/50" data-testid={`payment-link-item-${idx}`}>
                                <div className="flex-1 space-y-2">
                                    {vendors.length > 1 && (
                                        <Select
                                            value={item.vendorId}
                                            onValueChange={(v) => updateItem(item.id, { vendorId: v })}
                                        >
                                            <SelectTrigger data-testid={`payment-link-item-vendor-${idx}`}>
                                                <SelectValue placeholder="Select profile" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vendors.map(v => (
                                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <Input
                                        data-testid={`payment-link-item-description-${idx}`}
                                        placeholder="Description (e.g. Tarot Reading at Expo)"
                                        value={item.customDescription}
                                        onChange={(e) => updateItem(item.id, { customDescription: e.target.value })}
                                    />
                                    <div className="flex gap-2 items-center">
                                        <span className="text-sm text-slate-400">$</span>
                                        <Input
                                            data-testid={`payment-link-item-amount-${idx}`}
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-32"
                                            value={item.amount || ''}
                                            onChange={(e) => updateItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                                        />
                                        <span className="text-sm text-slate-400">{item.currency}</span>
                                    </div>
                                </div>
                                {items.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        data-testid={`payment-link-remove-item-${idx}`}
                                        onClick={() => removeItem(item.id)}
                                        className="text-slate-400 hover:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            size="sm"
                            data-testid="payment-link-add-item"
                            onClick={addItem}
                            className="w-full"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Item
                        </Button>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center p-3 rounded-lg bg-slate-800 border border-slate-700">
                        <span className="text-sm font-medium text-slate-300">Total</span>
                        <span className="text-lg font-bold text-white" data-testid="payment-link-total">
                            ${totalAmount.toFixed(2)} {items[0]?.currency || 'AUD'}
                        </span>
                    </div>

                    {/* Expiration */}
                    <div>
                        <Label>Link Expires In</Label>
                        <Select
                            value={expirationHours}
                            onValueChange={setExpirationHours}
                        >
                            <SelectTrigger data-testid="payment-link-expiration">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {EXPIRATION_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Submit */}
                    <Button
                        data-testid="payment-link-submit"
                        onClick={handleSubmit}
                        disabled={createMutation.isPending}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                        {createMutation.isPending ? (
                            <>Sending...</>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Payment Link
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
