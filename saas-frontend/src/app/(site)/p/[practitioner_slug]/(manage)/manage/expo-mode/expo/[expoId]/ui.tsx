'use client';

import React, { useState } from 'react';
import { Session } from 'next-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Store, Copy, QrCode, Plus, Pause, Play, Square, ShoppingBag,
    DollarSign, Users, Package, CreditCard, Banknote, X
} from 'lucide-react';
import { useExpo } from './_hooks/UseExpo';
import { useExpoItems, ExpoItemData } from './_hooks/UseExpoItems';
import { useExpoSales } from './_hooks/UseExpoSales';
import {
    useAddExpoItem, useUpdateExpoItem, useRemoveExpoItem,
    useGoLiveExpo, usePauseExpo, useResumeExpo, useEndExpo,
    useLogExpoSale
} from './_hooks/UseExpoMutations';
import PageQRCode from '@/components/ux/PageQRCode';
import { useToast } from '@/hooks/use-toast';

type Props = {
    session: Session;
    practitionerId: string;
    slug: string;
    expoId: string;
};

function formatAmount(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

function formatTimeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
}

export default function ExpoDashboardUI({ session, practitionerId, slug, expoId }: Props) {
    const { toast } = useToast();
    const { data: expo, isLoading: expoLoading } = useExpo(expoId, practitionerId);
    const { data: items } = useExpoItems(expoId);
    const { data: sales } = useExpoSales(expoId);

    const addItemMutation = useAddExpoItem(expoId);
    const updateItemMutation = useUpdateExpoItem(expoId);
    const removeItemMutation = useRemoveExpoItem(expoId);
    const goLiveMutation = useGoLiveExpo();
    const pauseMutation = usePauseExpo();
    const resumeMutation = useResumeExpo();
    const endMutation = useEndExpo();
    const logSaleMutation = useLogExpoSale(expoId);

    // Dialog states
    const [showAddItem, setShowAddItem] = useState(false);
    const [showLogSale, setShowLogSale] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    // Add item form
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemQty, setNewItemQty] = useState('');
    const [newItemTrackInventory, setNewItemTrackInventory] = useState(true);

    // Log sale form
    const [saleItems, setSaleItems] = useState<{ itemId: string; quantity: number }[]>([]);
    const [salePaymentMethod, setSalePaymentMethod] = useState('CASH');
    const [saleCustomerName, setSaleCustomerName] = useState('');

    const vendor = session.user.vendors?.find(v => v.id === practitionerId);
    const vendorCurrency = vendor?.currency || 'AUD';
    const shareUrl = expo ? `${window.location.origin}/expo/${expo.code}` : '';

    const activeItems = items?.filter(i => i.isActive) || [];
    const paidSales = sales?.filter(s => s.saleStatus === 'PAID') || [];

    if (expoLoading) {
        return (
            <div className="p-6 text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
            </div>
        );
    }

    if (!expo) {
        return (
            <div className="p-6 text-center py-12">
                <p className="text-slate-400">Expo not found</p>
            </div>
        );
    }

    const isActive = expo.expoStatus === 'SETUP' || expo.expoStatus === 'LIVE' || expo.expoStatus === 'PAUSED';
    const isLive = expo.expoStatus === 'LIVE';
    const isPaused = expo.expoStatus === 'PAUSED';
    const isSetup = expo.expoStatus === 'SETUP';
    const isEnded = expo.expoStatus === 'ENDED';

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied!', description: shareUrl });
    };

    const handleAddItem = async () => {
        if (!newItemName.trim() || !newItemPrice) return;
        const priceInCents = Math.round(parseFloat(newItemPrice) * 100);
        if (priceInCents <= 0) return;

        try {
            await addItemMutation.mutateAsync({
                expoId,
                vendorId: practitionerId,
                itemSource: 'AD_HOC',
                itemName: newItemName.trim(),
                price: { amount: priceInCents, currency: vendorCurrency },
                trackInventory: newItemTrackInventory,
                quantityBrought: newItemTrackInventory && newItemQty ? parseInt(newItemQty) : undefined,
            });
            setShowAddItem(false);
            setNewItemName('');
            setNewItemPrice('');
            setNewItemQty('');
            setNewItemTrackInventory(true);
        } catch {
            // Error handled by mutation
        }
    };

    const handleLogSale = async () => {
        const validItems = saleItems.filter(i => i.quantity > 0);
        if (validItems.length === 0) return;

        try {
            await logSaleMutation.mutateAsync({
                expoId,
                vendorId: practitionerId,
                items: validItems,
                paymentMethod: salePaymentMethod,
                customerName: saleCustomerName.trim() || undefined,
            });
            setShowLogSale(false);
            setSaleItems([]);
            setSaleCustomerName('');
            toast({ title: 'Sale logged!' });
        } catch {
            // Error handled by mutation
        }
    };

    const handleGoLive = async () => {
        try {
            await goLiveMutation.mutateAsync({ expoId, vendorId: practitionerId });
            toast({ title: 'Expo is live!' });
        } catch {
            // Error handled
        }
    };

    const handlePause = () => pauseMutation.mutate({ expoId, vendorId: practitionerId });
    const handleResume = () => resumeMutation.mutate({ expoId, vendorId: practitionerId });
    const handleEnd = () => {
        endMutation.mutate({ expoId, vendorId: practitionerId });
        setShowEndConfirm(false);
    };

    const toggleSaleItem = (itemId: string, delta: number) => {
        setSaleItems(prev => {
            const existing = prev.find(i => i.itemId === itemId);
            if (existing) {
                const newQty = Math.max(0, existing.quantity + delta);
                if (newQty === 0) return prev.filter(i => i.itemId !== itemId);
                return prev.map(i => i.itemId === itemId ? { ...i, quantity: newQty } : i);
            }
            if (delta > 0) return [...prev, { itemId, quantity: delta }];
            return prev;
        });
    };

    return (
        <div className="p-6 max-w-6xl" data-testid="expo-dashboard">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    {isLive && <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />}
                    {isPaused && <div className="h-3 w-3 rounded-full bg-amber-500" />}
                    {isSetup && <div className="h-3 w-3 rounded-full bg-blue-500" />}
                    <div>
                        <h1 className="text-2xl font-bold text-white">{expo.expoName}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge className={
                                isLive ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                isPaused ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                isSetup ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            } data-testid="expo-status-badge">
                                {expo.expoStatus}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isSetup && (
                        <Button
                            onClick={handleGoLive}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={goLiveMutation.isPending || activeItems.length === 0}
                            data-testid="go-live-btn"
                        >
                            {goLiveMutation.isPending ? 'Going Live...' : 'Go Live'}
                        </Button>
                    )}
                    {isLive && (
                        <Button
                            onClick={handlePause}
                            variant="outline"
                            disabled={pauseMutation.isPending}
                            data-testid="pause-btn"
                        >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                        </Button>
                    )}
                    {isPaused && (
                        <Button
                            onClick={handleResume}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={resumeMutation.isPending}
                            data-testid="resume-btn"
                        >
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                        </Button>
                    )}
                    {isActive && (
                        <Button
                            onClick={() => setShowEndConfirm(true)}
                            variant="destructive"
                            data-testid="end-expo-btn"
                        >
                            <Square className="h-4 w-4 mr-2" />
                            End Expo
                        </Button>
                    )}
                </div>
            </div>

            {/* Share URL */}
            {isActive && (
                <Card className="mb-6 bg-slate-900 border-slate-700" data-testid="share-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0">
                                <span className="truncate font-mono">{shareUrl}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button size="sm" variant="ghost" onClick={handleCopyLink} data-testid="copy-link-btn">
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setShowQR(true)} data-testid="show-qr-btn">
                                    <QrCode className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <ShoppingBag className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-white" data-testid="stat-sales">{expo.totalSales}</p>
                        <p className="text-xs text-slate-400">Sales</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <DollarSign className="h-5 w-5 text-green-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-white" data-testid="stat-revenue">{formatAmount(expo.totalRevenue)}</p>
                        <p className="text-xs text-slate-400">Revenue</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <Package className="h-5 w-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-white" data-testid="stat-items-sold">{expo.totalItemsSold}</p>
                        <p className="text-xs text-slate-400">Items Sold</p>
                    </CardContent>
                </Card>
                <Card className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <Users className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-white" data-testid="stat-customers">{expo.totalCustomers}</p>
                        <p className="text-xs text-slate-400">Customers</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content: Catalog + Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Catalog */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Catalog</h2>
                        {!isEnded && (
                            <Button
                                size="sm"
                                onClick={() => setShowAddItem(true)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                data-testid="add-item-btn"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Item
                            </Button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {(items || []).map((item) => {
                            const available = item.trackInventory && item.quantityBrought != null
                                ? item.quantityBrought - (item.quantitySold || 0)
                                : null;
                            const soldOut = available != null && available <= 0;

                            return (
                                <Card
                                    key={item.id}
                                    className={`bg-slate-900 border-slate-700 ${!item.isActive ? 'opacity-50' : ''} ${soldOut ? 'border-red-500/30' : ''}`}
                                    data-testid={`catalog-item-${item.id}`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-white">{item.itemName}</p>
                                                <p className="text-sm text-slate-400">
                                                    {formatAmount(item.price.amount)}
                                                    {item.trackInventory && item.quantityBrought != null && (
                                                        <> &middot; {item.quantitySold || 0}/{item.quantityBrought} sold</>
                                                    )}
                                                    {!item.trackInventory && item.quantitySold > 0 && (
                                                        <> &middot; {item.quantitySold} done</>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {soldOut && (
                                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">SOLD OUT</Badge>
                                                )}
                                                {!isEnded && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            updateItemMutation.mutate({
                                                                itemId: item.id,
                                                                expoId,
                                                                isActive: !item.isActive,
                                                            });
                                                        }}
                                                        data-testid={`toggle-item-${item.id}`}
                                                    >
                                                        {item.isActive ? 'Disable' : 'Enable'}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {(!items || items.length === 0) && (
                            <div className="text-center py-8 text-slate-400">
                                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No items yet. Add your first item!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sales Feed */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">Sales Feed</h2>
                        {isActive && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSaleItems([]);
                                    setSaleCustomerName('');
                                    setShowLogSale(true);
                                }}
                                data-testid="log-sale-btn"
                            >
                                <Banknote className="h-4 w-4 mr-1" />
                                Log Walk-Up Sale
                            </Button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {paidSales.map((sale) => (
                            <Card key={sale.id} className="bg-slate-900 border-slate-700" data-testid={`sale-${sale.id}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">#{sale.saleNumber}</span>
                                            <span className="text-sm text-slate-400">{sale.customerName || 'Walk-up'}</span>
                                        </div>
                                        <span className="text-xs text-slate-500">{formatTimeAgo(sale.createdAt)}</span>
                                    </div>
                                    <div className="text-sm text-slate-400">
                                        {sale.items.map((i, idx) => (
                                            <span key={idx}>
                                                {idx > 0 && ', '}
                                                {i.quantity}x {i.itemName}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                                {sale.saleChannel === 'QR' ? 'QR' : 'Walk-up'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                                {sale.paymentMethod === 'STRIPE' ? (
                                                    <><CreditCard className="h-3 w-3 mr-1" />Card</>
                                                ) : (
                                                    <><Banknote className="h-3 w-3 mr-1" />{sale.paymentMethod}</>
                                                )}
                                            </Badge>
                                        </div>
                                        <span className="font-medium text-white">{formatAmount(sale.subtotal.amount)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {paidSales.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No sales yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inventory Reconciliation (Ended) */}
            {isEnded && items && items.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-white mb-4">Inventory Reconciliation</h2>
                    <div className="space-y-2">
                        {items.map(item => {
                            const remaining = item.trackInventory && item.quantityBrought != null
                                ? item.quantityBrought - (item.quantitySold || 0)
                                : null;
                            return (
                                <div key={item.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-800">
                                    <span className="text-white">{item.itemName}</span>
                                    <div className="flex items-center gap-4 text-slate-400">
                                        {item.trackInventory && item.quantityBrought != null ? (
                                            <>
                                                <span>Brought: {item.quantityBrought}</span>
                                                <span>Sold: {item.quantitySold || 0}</span>
                                                <span className="text-white font-medium">Remaining: {remaining}</span>
                                            </>
                                        ) : (
                                            <span>Sold: {item.quantitySold || 0}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Add Item Dialog */}
            <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
                <DialogContent className="sm:max-w-md" data-testid="add-item-dialog">
                    <DialogHeader>
                        <DialogTitle>Add Item</DialogTitle>
                        <DialogDescription>Add an item to your expo catalog.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="item-name">Item Name</Label>
                            <Input
                                id="item-name"
                                placeholder="e.g. Amethyst Cluster"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                data-testid="item-name-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="item-price">Price ($)</Label>
                            <Input
                                id="item-price"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="45.00"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value)}
                                data-testid="item-price-input"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id="track-inventory"
                                type="checkbox"
                                checked={newItemTrackInventory}
                                onChange={(e) => setNewItemTrackInventory(e.target.checked)}
                                className="rounded"
                                data-testid="track-inventory-checkbox"
                            />
                            <Label htmlFor="track-inventory">Track inventory</Label>
                        </div>
                        {newItemTrackInventory && (
                            <div className="space-y-2">
                                <Label htmlFor="item-qty">Quantity Brought</Label>
                                <Input
                                    id="item-qty"
                                    type="number"
                                    min="1"
                                    placeholder="12"
                                    value={newItemQty}
                                    onChange={(e) => setNewItemQty(e.target.value)}
                                    data-testid="item-qty-input"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowAddItem(false)} data-testid="cancel-add-item-btn">Cancel</Button>
                        <Button
                            onClick={handleAddItem}
                            disabled={!newItemName.trim() || !newItemPrice || addItemMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            data-testid="confirm-add-item-btn"
                        >
                            {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Log Walk-Up Sale Dialog */}
            <Dialog open={showLogSale} onOpenChange={setShowLogSale}>
                <DialogContent className="sm:max-w-lg" data-testid="log-sale-dialog">
                    <DialogHeader>
                        <DialogTitle>Log Walk-Up Sale</DialogTitle>
                        <DialogDescription>Record a cash or other walk-up sale.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Items</Label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {activeItems.map(item => {
                                    const qty = saleItems.find(s => s.itemId === item.id)?.quantity || 0;
                                    const available = item.trackInventory && item.quantityBrought != null
                                        ? item.quantityBrought - (item.quantitySold || 0)
                                        : null;

                                    return (
                                        <div key={item.id} className="flex items-center justify-between p-2 bg-slate-800 rounded" data-testid={`sale-item-${item.id}`}>
                                            <div>
                                                <span className="text-sm text-white">{item.itemName}</span>
                                                <span className="text-xs text-slate-400 ml-2">{formatAmount(item.price.amount)}</span>
                                                {available != null && <span className="text-xs text-slate-500 ml-2">({available} left)</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleSaleItem(item.id, -1)}
                                                    disabled={qty === 0}
                                                    data-testid={`sale-item-minus-${item.id}`}
                                                >
                                                    -
                                                </Button>
                                                <span className="text-white w-6 text-center">{qty}</span>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => toggleSaleItem(item.id, 1)}
                                                    disabled={available != null && qty >= available}
                                                    data-testid={`sale-item-plus-${item.id}`}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <Select value={salePaymentMethod} onValueChange={setSalePaymentMethod}>
                                <SelectTrigger data-testid="payment-method-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sale-customer">Customer Name (optional)</Label>
                            <Input
                                id="sale-customer"
                                placeholder="Sarah M."
                                value={saleCustomerName}
                                onChange={(e) => setSaleCustomerName(e.target.value)}
                                data-testid="sale-customer-input"
                            />
                        </div>
                        {saleItems.length > 0 && (
                            <div className="text-right text-sm text-white font-medium">
                                Total: {formatAmount(saleItems.reduce((total, si) => {
                                    const item = activeItems.find(i => i.id === si.itemId);
                                    return total + (item ? item.price.amount * si.quantity : 0);
                                }, 0))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowLogSale(false)} data-testid="cancel-log-sale-btn">Cancel</Button>
                        <Button
                            onClick={handleLogSale}
                            disabled={saleItems.filter(i => i.quantity > 0).length === 0 || logSaleMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            data-testid="confirm-log-sale-btn"
                        >
                            {logSaleMutation.isPending ? 'Logging...' : 'Log Sale'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QR Code Dialog */}
            <Dialog open={showQR} onOpenChange={setShowQR}>
                <DialogContent className="sm:max-w-sm" data-testid="qr-dialog">
                    <DialogHeader>
                        <DialogTitle className="text-center">Scan to Shop</DialogTitle>
                    </DialogHeader>
                    <div className="flex justify-center py-6">
                        <PageQRCode
                            url={shareUrl}
                            size={280}
                            label={expo.expoName}
                        />
                    </div>
                    <p className="text-center text-sm text-slate-400 font-mono">{shareUrl}</p>
                </DialogContent>
            </Dialog>

            {/* End Expo Confirmation */}
            <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
                <AlertDialogContent data-testid="end-expo-confirm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>End this expo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            No new QR purchases will be accepted. You&apos;ll still be able to view sales history and inventory.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel data-testid="cancel-end-btn">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleEnd}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            data-testid="confirm-end-btn"
                        >
                            End Expo
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
