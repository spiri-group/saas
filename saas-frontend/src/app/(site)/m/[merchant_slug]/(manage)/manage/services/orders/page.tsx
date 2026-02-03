'use client';

import { use, useState } from 'react';
import { useMyServiceOrders } from './hooks/UseMyServiceOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, User, Package, Sparkles, Heart, MessageCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import UseMerchantIdFromSlug from '@/app/(site)/m/_hooks/UseMerchantIdFromSlug';
import FulfillmentDialog from './_components/FulfillmentDialog';
import { useQueryClient } from '@tanstack/react-query';

export default function ServiceOrdersPage({ params }: { params: Promise<{ merchant_slug: string }> }) {
  const { merchant_slug } = use(params);
  const { data: merchantData } = UseMerchantIdFromSlug(merchant_slug);
  const merchantId = merchantData?.merchantId;
  const queryClient = useQueryClient();

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: paidOrders } = useMyServiceOrders(merchantId, 'PAID', categoryFilter === 'ALL' ? undefined : categoryFilter);
  const { data: inProgressOrders } = useMyServiceOrders(merchantId, 'IN_PROGRESS', categoryFilter === 'ALL' ? undefined : categoryFilter);
  const { data: deliveredOrders } = useMyServiceOrders(merchantId, 'DELIVERED', categoryFilter === 'ALL' ? undefined : categoryFilter);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'READING':
        return <Sparkles className="h-4 w-4" />;
      case 'HEALING':
        return <Heart className="h-4 w-4" />;
      case 'COACHING':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'READING':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'HEALING':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'COACHING':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleOpenFulfillment = (order: any) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleFulfillmentSuccess = () => {
    // Invalidate all order queries to refresh the lists
    queryClient.invalidateQueries({ queryKey: ['my-service-orders'] });
  };

  const OrderCard = ({ order }: { order: any }) => {
    const dueDate = order.service.turnaroundDays
      ? new Date(new Date(order.purchaseDate).getTime() + order.service.turnaroundDays * 24 * 60 * 60 * 1000)
      : null;
    const isOverdue = dueDate && new Date() > dueDate;
    const isDelivered = order.orderStatus === 'DELIVERED';

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Badge className={getCategoryColor(order.service.category)}>
                <div className="flex items-center gap-1">
                  {getCategoryIcon(order.service.category)}
                  {order.service.category}
                </div>
              </Badge>
              <h3 className="font-semibold text-lg">{order.service.name}</h3>
            </div>
            <Badge variant={order.orderStatus === 'PAID' ? 'default' : order.orderStatus === 'IN_PROGRESS' ? 'secondary' : 'outline'}>
              {order.orderStatus}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Customer #{order.customerId.slice(0, 8)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Purchased {format(new Date(order.purchaseDate), 'MMM d, yyyy')}
            </span>
            {dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Package className="h-4 w-4" />
                Due {format(dueDate, 'MMM d, yyyy')} {isOverdue && '(Overdue)'}
              </span>
            )}
          </div>

          {order.questionnaireResponses && order.questionnaireResponses.length > 0 && (
            <div className="mb-4 p-3 bg-muted/50 rounded-md">
              <p className="font-medium text-sm mb-2">Client Responses:</p>
              <ul className="space-y-1 text-sm">
                {order.questionnaireResponses.slice(0, 2).map((response: any, idx: number) => (
                  <li key={idx} className="text-muted-foreground">
                    <span className="font-medium">{response.question}:</span> {response.answer}
                  </li>
                ))}
                {order.questionnaireResponses.length > 2 && (
                  <li className="text-muted-foreground italic">
                    +{order.questionnaireResponses.length - 2} more responses
                  </li>
                )}
              </ul>
            </div>
          )}

          {isDelivered ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOpenFulfillment(order)}
              data-testid="view-details-button"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => handleOpenFulfillment(order)}
              data-testid="start-fulfillment-button"
            >
              {order.orderStatus === 'PAID' ? 'Start Fulfillment' : 'Continue Working'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!merchantId) {
    return (
      <div className="container mx-auto py-8 max-w-7xl">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Orders</h1>
          <p className="text-muted-foreground">Manage and fulfill your service orders</p>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="READING">Readings</SelectItem>
            <SelectItem value="HEALING">Healings</SelectItem>
            <SelectItem value="COACHING">Coaching</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="paid" className="space-y-6">
        <TabsList>
          <TabsTrigger value="paid">
            To Fulfill <Badge className="ml-2" variant="secondary">{paidOrders?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress <Badge className="ml-2" variant="secondary">{inProgressOrders?.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="delivered">
            Delivered <Badge className="ml-2" variant="secondary">{deliveredOrders?.length || 0}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paid">
          {!paidOrders || paidOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No orders waiting for fulfillment
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {paidOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in-progress">
          {!inProgressOrders || inProgressOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No orders in progress
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {inProgressOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="delivered">
          {!deliveredOrders || deliveredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No delivered orders yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {deliveredOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Fulfillment Dialog */}
      {selectedOrder && merchantId && (
        <FulfillmentDialog
          order={selectedOrder}
          merchantId={merchantId}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleFulfillmentSuccess}
        />
      )}
    </div>
  );
}
