'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselScrollToBottom, CarouselScrollToTop } from "@/components/ux/Carousel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { capitalize } from "@/lib/functions";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import useOrderRefundPolicy, { RefundPolicyForOrderType } from "../hooks/UseOrderRefundPolicy";
import { useState } from "react";

type RefundPolicyModalProps = {
    orderId: string;
    children?: React.ReactNode;
}

const RefundPolicyModal: React.FC<RefundPolicyModalProps> = ({ orderId, children }) => {
    const [open, setOpen] = useState(false);
    const { data: policy, isLoading, error } = useOrderRefundPolicy(orderId);

    const renderRefundPolicy = (policy: RefundPolicyForOrderType) => {
        // Separate reasons with and without refunds
        const refundableReasons = policy.reasons.filter(reason => !reason.no_refund);
        const noRefundReasons = policy.reasons.filter(reason => reason.no_refund);

        return (
            <div className="w-[800px] h-[600px] flex flex-col">
                <DialogTitle>Refund Policy</DialogTitle>
                {/* No Refund Reasons Section */}
                {noRefundReasons.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-red-700 mb-2">Items Not Eligible for Refund</h4>
                        <ul className="list-disc list-inside grid grid-cols-3 gap-2">
                            {noRefundReasons.map((reason) => (
                                <li key={reason.id} className="text-sm text-gray-700">{reason.title}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Refundable Reasons Section */}
                {refundableReasons.length > 0 && (
                    <div className="mt-4 flex-grow min-h-0 flex flex-col">
                        <h3 className="text-lg font-semibold mb-4">Refund Options Available</h3>
                        <Carousel 
                            plugins={[WheelGesturesPlugin()]}
                            orientation="vertical"
                            className="flex-grow min-h-0"
                            >
                            <div className="flex flex-row gap-3">
                                <CarouselScrollToTop style="RECTANGLE" />
                                <CarouselPrevious aria-label="previous-reason" className="flex-grow" style="RECTANGLE" />
                            </div>
                            <CarouselContent className="py-2 space-y-4">
                                {refundableReasons.map((reason) => (
                                    <CarouselItem aria-label={reason.code} key={reason.id} className="p-3 border rounded-lg">
                                        <div className="flex flex-col">
                                            <div className="mb-2">
                                                <h4 className="font-bold text-lg">{reason.title}</h4>
                                                <p className="text-sm text-muted-foreground"><span className="font-bold">{capitalize(reason.whoPayShipping)}</span> pays for return shipping.</p>
                                            </div>
                                            <div className="flex flex-row gap-3 mt-2">
                                                <div className="flex-none w-32">
                                                    <h5 className="mb-2 font-medium">Timeframes</h5>
                                                    <ul className="space-y-1">
                                                        {reason.tiers.map((tier) => (
                                                            <li key={tier.id}>
                                                                <p><span className="text-slate-600">Within </span><span className="font-bold">{tier.daysUpTo}</span> <span className="text-slate-600">days: </span><span className="font-bold text-green-600">{tier.refundPercentage * 100}%</span><span className="text-slate-600"> refund</span></p>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="flex-grow">
                                                    <h5 className="mb-2 font-medium">Conditions</h5>
                                                    <Accordion type="single" collapsible className="w-full">
                                                        {reason.conditions.map((condition) => {
                                                            const maxDaysUpTo = Math.max(...reason.tiers.map(tier => tier.daysUpTo));
                                                            const description = condition.description.replace(/\[X\]/g, maxDaysUpTo.toString());
                                                            return (
                                                                <AccordionItem key={condition.id} value={condition.id}>
                                                                    <AccordionTrigger className="font-bold text-md">{condition.title}</AccordionTrigger>
                                                                    <AccordionContent>{description}</AccordionContent>
                                                                </AccordionItem>
                                                            );
                                                        })}
                                                    </Accordion>
                                                </div>
                                            </div>
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <div className="flex flex-row gap-3">
                                <CarouselScrollToBottom style="RECTANGLE" />
                                <CarouselNext aria-label="next-reason" className="flex-grow" style="RECTANGLE" />
                            </div>
                        </Carousel>
                    </div>
                )}
                
                {/* Close Button */}
                <div className="mt-4 flex">
                    <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button variant="link" size="sm">View Refund Policy</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    {isLoading && <p>Loading refund policy...</p>}
                    {error && <p>Error loading refund policy</p>}
                    {policy && renderRefundPolicy(policy)}
                    {!policy && !isLoading && !error && <p>No refund policy found for this order</p>}
                </DialogHeader>
            </DialogContent>
        </Dialog>
    );
};

export default RefundPolicyModal;