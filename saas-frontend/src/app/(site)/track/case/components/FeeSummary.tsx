'use client' 

import React, { useState } from "react";
import { order_type, recordref_type} from "@/utils/spiriverse";
import StripePayment from "../../../components/StripePayment";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UseOrders from "../../../m/_components/Order/hooks/UseOrders";
import OrderRow from "../../../m/_components/Order/components/OrderRow";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ux/Carousel";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";

type BLProps = {
    forObject: recordref_type
}

type Props = BLProps & {
   
}

const useBL = (props: BLProps) => {
    const [selectedOrder, setSelectedOrder] = useState<order_type | null>(null)
    
    const orders = UseOrders(undefined, undefined, props.forObject, undefined)

    return {
        orders: {
            isLoading: orders.isLoading,
            get: orders.data ?? []
        },
        selectedOrder: {
            get: selectedOrder,
            set: setSelectedOrder
        }
    }
}

const FeeSummary: React.FC<Props> = (props) => {
    const bl = useBL(props);

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-lg font-bold"> Fee Summary </h2>
            {
                bl.orders.isLoading ? (
                    <span className="text-xs">Loading...</span>
                ) : (
                    <>
                        {bl.orders.get !== undefined && bl.orders.get.length > 0 ? (
                            <Carousel 
                                plugins={[WheelGesturesPlugin()]}
                                orientation="vertical" 
                                className="flex-grow min-h-0 flex flex-col">
                            <CarouselPrevious style="RECTANGLE" className="flex-none w-full mb-3" />
                            <CarouselContent outerClassName="flex-grow" className="flex-col space-y-2 h-full w-full">
                                {bl.orders.get.map((order) => (
                                    <CarouselItem key={order.id}>
                                    <OrderRow 
                                        order={order}
                                        page={"trackCase"}
                                        setSelectedOrder={bl.selectedOrder.set}                                                 
                                    />
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselNext style="RECTANGLE" className="flex-none w-full mt-3" />
                            </Carousel>
                        ) : (
                                <span className="p-2">No fees requiring to be paid yet.</span>
                        )}
                    </>
                )
            }
            {bl.selectedOrder.get != null &&
                <>
                    <Dialog open={bl.selectedOrder.get != null && bl.selectedOrder.get.stripe != null} onOpenChange={() => bl.selectedOrder.set(null)}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Enter billing information</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-row">
                                <StripePayment
                                    type="SETUP"
                                    onCancel={() => {}}
                                    onAlter={() => {}}
                                    stripeAccountId={bl.selectedOrder.get.stripe!.accountId}
                                    clientSecret={bl.selectedOrder.get.stripe!.setupIntentSecret} 
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            }
        </div>
        
        
    )
}

export default FeeSummary;