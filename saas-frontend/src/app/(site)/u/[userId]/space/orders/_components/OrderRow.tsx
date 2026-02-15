'use client';

import PDFSaveButton from "@/app/(site)/components/0_PDFS/_components/PDFSaveButton";
import { tax_invoice_query } from "@/app/(site)/components/0_PDFS/tax_invoice";
import { InvoiceUI } from "@/app/(site)/components/0_PDFS/tax_invoice/render";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel";
import CDNImage from "@/components/ux/CDNImage";
import PaidStatusBadge from "@/components/ux/PaidStatusBadge";
import { Panel, PanelContent, PanelHeader, PanelTitle } from "@/components/ux/Panel";
import { isNullOrUndefined, isNullOrWhitespace } from "@/lib/functions";
import { order_type } from "@/utils/spiriverse";
import { DateTime } from "luxon";
import RefundPolicyModal from "./RefundPolicyModal";
import RefundModal from "./RefundModal";
import OrderDetailsModal from "./OrderDetailsModal";
import useOrderRefundPolicy from "../hooks/UseOrderRefundPolicy";
import useRefundEligibility from "../hooks/UseRefundEligibility";

type OrderRowProps = {
    order: order_type
}

const OrderRow: React.FC<OrderRowProps> = ({ order }) => {

    // if the order has multiple lines we will concatenate the descriptions into a single string
    const orderDescription = order.lines.map(line => line.descriptor).join(", ");
    const createdOn = DateTime.fromISO(order.createdDate);
    // if its greater than 30 days we will show the date, otherwise we will show the relative time
    const showDate = createdOn.diffNow().as("days") < -30;
    
    const { data: refundPolicy } = useOrderRefundPolicy(order.id);
    const eligibility = useRefundEligibility(order, refundPolicy);


    return (
        <Panel className="pb-8 w-full">
            <PanelHeader className="flex flex-row justify-between pt-2 pl-2">
                <PanelTitle>
                    <span>{order.code}</span>
                </PanelTitle>
                <div className="pr-2">
                    <span>Created {showDate ? createdOn.toLocaleString() : `${createdOn.toRelative()} (${createdOn.toFormat('EEE d MMM')})`}</span>
                </div>
            </PanelHeader>
            <PanelContent className="flex flex-row w-full">
                <div className="flex flex-col">
                    {/* <span className="font-bold text-center">{order.orderStatus}</span> */}
                </div>
                <div className="flex flex-col">
                    <p className="truncate w-44 p-2 text-sm">
                        {orderDescription}
                    </p>
                    <div className="flex flex-col gap-2 mt-auto">
                        <OrderDetailsModal order={order}>
                            <Button variant="link" className="w-full">View Details</Button>
                        </OrderDetailsModal>
                        <RefundPolicyModal orderId={order.id}>
                            <Button variant="link" size="sm" className="w-full">View Refund Policy</Button>
                        </RefundPolicyModal>
                        {eligibility.isEligible && (
                            <RefundModal order={order} />
                        )}
                    </div>
                </div>
                <Carousel orientation="horizontal" className="min-w-auto flex-grow flex flex-row h-[150px] ml-3">
                    <CarouselPrevious style="RECTANGLE" className="h-full" />
                    <CarouselContent outerClassName="mx-3 flex-grow min-w-auto">
                        {order.lines.map((line, idx) => {
                            if (!isNullOrUndefined(line.image) && !isNullOrWhitespace(line.image.url)) {
                                return (
                                    <CarouselItem key={idx}>
                                        <CDNImage 
                                            className="rounded-xl"
                                            height={150}
                                            width={150}
                                            src={line.image.url} 
                                            alt={line.descriptor} 
                                        />
                                    </CarouselItem>
                                );
                            }
                            return null;
                        })}
                    </CarouselContent>
                    <CarouselNext style="RECTANGLE" className="h-full" />
                </Carousel>
                <div className="w-44 flex flex-col mx-3">
                    <PaidStatusBadge className="w-full text-center font-bold" status={order.paid_status} size="lg" />
                    <PDFSaveButton
                        label="Download Invoice"
                        defaultFileName={`${order.code}.pdf`}
                        component={<InvoiceUI />}
                        data_loader={async () => 
                            await tax_invoice_query({ 
                                customerEmail: order.customerEmail, 
                                orderId: order.id
                             })
                        } />
                    {!eligibility.isEligible && refundPolicy && (
                        <div className="w-full text-center text-sm text-muted-foreground mt-auto mb-2">
                            Refund options have expired
                        </div>
                    )}
                </div>
            </PanelContent>
        </Panel>
    )
}

export default OrderRow;