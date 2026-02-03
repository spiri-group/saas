'use client';

import PDFSaveButton from "@/app/(site)/components/0_PDFS/_components/PDFSaveButton";
import { tax_invoice_query } from "@/app/(site)/components/0_PDFS/tax_invoice";
import { InvoiceUI } from "@/app/(site)/components/0_PDFS/tax_invoice/render";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CDNImage from "@/components/ux/CDNImage";
import CurrencySpan from "@/components/ux/CurrencySpan";
import PaidStatusBadge from "@/components/ux/PaidStatusBadge";
import { order_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import ResponsiveContainer from "./ResponsiveContainer";

type OrderDetailsModalProps = {
    order: order_type;
    children: React.ReactNode;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, children }) => {
    const createdOn = DateTime.fromISO(order.createdDate);

    const renderOrderDetails = (onClose?: () => void) => {
        // Calculate totals
        const subtotal = order.lines.reduce((sum, line) => sum + (line.price?.amount || 0) * (line.quantity || 0), 0);
        const tax = order.lines.reduce((sum, line) => sum + (line.tax?.amount || 0), 0);
        const total = subtotal + tax;

        return (
            <>
                <DialogHeader>
                    <DialogTitle>Order #{order.code}</DialogTitle>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Ordered on {createdOn.toLocaleString(DateTime.DATETIME_MED)}</span>
                        <PaidStatusBadge status={order.paid_status} size="sm" />
                    </div>
                </DialogHeader>

                <div className="flex-grow overflow-auto space-y-6">
                    {/* Shipping Information */}
                    {order.delivery && (
                        <div className="space-y-2">
                            <h3 className="font-semibold">Ship To</h3>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium">{order.delivery.name}</p>
                                <p className="text-sm text-muted-foreground">{order.delivery.address}</p>
                            </div>
                        </div>
                    )}

                    {/* Billing Information */}
                    {order.billing && (
                        <div className="space-y-2">
                            <h3 className="font-semibold">Bill To</h3>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="font-medium">{order.billing.name}</p>
                                <p className="text-sm text-muted-foreground">{order.billing.address}</p>
                            </div>
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Items</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {order.lines.map((line) => (
                                    <TableRow key={line.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {line.image && (
                                                    <CDNImage
                                                        src={line.image.url}
                                                        alt={line.descriptor}
                                                        width={40}
                                                        height={40}
                                                        className="rounded"
                                                    />
                                                )}
                                                <div>
                                                    <p className="font-medium">{line.descriptor}</p>
                                                    {line.item_description && (
                                                        <p className="text-sm text-muted-foreground">{line.item_description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">{line.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            <CurrencySpan value={line.price} withAnimation={false} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <CurrencySpan 
                                                value={{
                                                    amount: (line.price?.amount || 0) * (line.quantity || 0),
                                                    currency: line.price?.currency || 'USD'
                                                }} 
                                                withAnimation={false} 
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Order Summary */}
                    <div className="space-y-2">
                        <h3 className="font-semibold">Order Summary</h3>
                        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <CurrencySpan 
                                    value={{
                                        amount: subtotal,
                                        currency: order.lines[0]?.price?.currency || 'USD'
                                    }} 
                                    withAnimation={false} 
                                />
                            </div>
                            {tax > 0 && (
                                <div className="flex justify-between">
                                    <span>Tax:</span>
                                    <CurrencySpan 
                                        value={{
                                            amount: tax,
                                            currency: order.lines[0]?.price?.currency || 'USD'
                                        }} 
                                        withAnimation={false} 
                                    />
                                </div>
                            )}
                            <div className="flex justify-between font-semibold text-lg border-t pt-2">
                                <span>Total:</span>
                                <CurrencySpan 
                                    value={{
                                        amount: total,
                                        currency: order.lines[0]?.price?.currency || 'USD'
                                    }} 
                                    withAnimation={false} 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer with PDF Download and Close Button */}
                <div className="flex items-center pt-4 border-t">
                    {onClose && (
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    )}
                    <PDFSaveButton
                        className="flex-grow"
                        defaultFileName={`order-${order.code}.pdf`}
                        component={<InvoiceUI />}
                        label="Download Invoice"
                        data_loader={async () => 
                            await tax_invoice_query({ 
                                customerEmail: order.customerEmail, 
                                orderId: order.id
                             })
                        }
                    />
                </div>
            </>
        );
    };

    return (
        <ResponsiveContainer content={renderOrderDetails}>
            {children}
        </ResponsiveContainer>
    );
};

export default OrderDetailsModal;