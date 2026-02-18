'use client';

import { useState } from 'react';
import { Package, Sparkles, Clock, CheckCircle, Download, Eye, ChevronRight, ShoppingBag } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DateTime } from 'luxon';
import UseOrders from '@/app/(site)/m/_components/Order/hooks/UseOrders';
import UseCustomerServiceOrders, { ServiceOrder } from './hooks/UseCustomerServiceOrders';
import OrderRow from './_components/OrderRow';
import CDNImage from '@/components/ux/CDNImage';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ServiceOrderDetail from './_components/ServiceOrderDetail';

type Props = {
    userId: string;
    userEmail: string;
};

const UI: React.FC<Props> = ({ userId, userEmail }) => {
    const productOrders = UseOrders(userEmail);
    const serviceOrders = UseCustomerServiceOrders(userId);
    const [selectedServiceOrder, setSelectedServiceOrder] = useState<ServiceOrder | null>(null);

    const productCount = productOrders.data?.length ?? 0;
    const serviceCount = serviceOrders.data?.length ?? 0;
    const isLoading = productOrders.isLoading || serviceOrders.isLoading;

    return (
        <div className="min-h-screen-minus-nav flex flex-col p-4 md:p-6" data-testid="orders-page">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-500/20 rounded-xl">
                    <Package className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                    <h1 className="text-xl font-light text-white">My Orders</h1>
                    <p className="text-slate-400 text-sm">Products and services in one place</p>
                </div>
            </div>

            {/* Content */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 flex-grow">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Package className="w-10 h-10 text-amber-400 animate-pulse" />
                        <p className="text-slate-400 mt-4 text-sm">Loading orders...</p>
                    </div>
                ) : productCount === 0 && serviceCount === 0 ? (
                    <div className="text-center py-16">
                        <ShoppingBag className="w-12 h-12 text-amber-400/40 mx-auto mb-6" />
                        <h2 className="text-xl font-light text-white mb-2">No orders yet</h2>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto">
                            Your product purchases and service orders will appear here
                        </p>
                    </div>
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="mb-4 bg-white/5 border border-white/10">
                            <TabsTrigger value="all" data-testid="orders-tab-all" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300">
                                All ({productCount + serviceCount})
                            </TabsTrigger>
                            {productCount > 0 && (
                                <TabsTrigger value="products" data-testid="orders-tab-products" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300">
                                    <Package className="w-3.5 h-3.5 mr-1.5" />
                                    Products ({productCount})
                                </TabsTrigger>
                            )}
                            {serviceCount > 0 && (
                                <TabsTrigger value="services" data-testid="orders-tab-services" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300">
                                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                    Services ({serviceCount})
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <TabsContent value="all" className="space-y-3">
                            {serviceCount > 0 && (
                                <ServiceOrdersList
                                    orders={serviceOrders.data ?? []}
                                    onSelect={setSelectedServiceOrder}
                                />
                            )}
                            {productCount > 0 && (
                                <div className="space-y-3">
                                    {(productOrders.data ?? []).map((order) => (
                                        <OrderRow key={order.id} order={order} />
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {productCount > 0 && (
                            <TabsContent value="products" className="space-y-3">
                                {(productOrders.data ?? []).map((order) => (
                                    <OrderRow key={order.id} order={order} />
                                ))}
                            </TabsContent>
                        )}

                        {serviceCount > 0 && (
                            <TabsContent value="services" className="space-y-3">
                                <ServiceOrdersList
                                    orders={serviceOrders.data ?? []}
                                    onSelect={setSelectedServiceOrder}
                                />
                            </TabsContent>
                        )}
                    </Tabs>
                )}
            </div>

            {/* Service Order Detail Dialog */}
            <Dialog open={selectedServiceOrder !== null} onOpenChange={(open) => !open && setSelectedServiceOrder(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {selectedServiceOrder && (
                        <ServiceOrderDetail
                            orderId={selectedServiceOrder.id}
                            userId={userId}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const ServiceOrdersList: React.FC<{
    orders: ServiceOrder[];
    onSelect: (order: ServiceOrder) => void;
}> = ({ orders, onSelect }) => {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'PAID':
                return { label: 'Pending', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
            case 'IN_PROGRESS':
                return { label: 'In Progress', icon: Sparkles, color: 'text-blue-400', bg: 'bg-blue-500/20' };
            case 'DELIVERED':
                return { label: 'Delivered', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' };
            default:
                return { label: status, icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/20' };
        }
    };

    return (
        <div className="space-y-2">
            {orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                const purchaseDate = DateTime.fromISO(order.purchaseDate);

                return (
                    <button
                        key={order.id}
                        data-testid={`service-order-${order.id}`}
                        onClick={() => onSelect(order)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.07] transition-all text-left"
                    >
                        {/* Thumbnail */}
                        {order.service?.thumbnail?.image?.media?.url ? (
                            <CDNImage
                                src={order.service.thumbnail.image.media.url}
                                alt={order.service?.name ?? 'Service'}
                                width={48}
                                height={48}
                                className="rounded-lg object-cover w-12 h-12 shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                            </div>
                        )}

                        {/* Info */}
                        <div className="flex-grow min-w-0">
                            <p className="text-sm text-white font-medium truncate">{order.service?.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-400/30 text-purple-300">
                                    {order.service?.category}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                    {purchaseDate.toRelative()}
                                </span>
                            </div>
                        </div>

                        {/* Status */}
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusConfig.bg} shrink-0`}>
                            <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                            <span className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</span>
                        </div>

                        {/* Action */}
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                );
            })}
        </div>
    );
};

export default UI;
