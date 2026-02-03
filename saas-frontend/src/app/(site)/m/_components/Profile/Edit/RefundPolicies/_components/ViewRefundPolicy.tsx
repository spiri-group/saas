import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselScrollToBottom, CarouselScrollToTop } from "@/components/ux/Carousel"
import { RefundPolicySchemaType } from "../_hooks/UseUpsertRefundPolcy"
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { capitalize } from "@/lib/functions"
import { DialogTitle } from "@/components/ui/dialog"
import { DateTime } from "luxon"

const ViewRefundPolicy = ({ policy }: { 
    policy: RefundPolicySchemaType
}) => {
    const formatLastUpdated = (updatedDate?: string) => {
        if (!updatedDate) return null;
        
        try {
            const date = DateTime.fromISO(updatedDate);
            return date.toRelative();
        } catch {
            return "Recently";
        }
    };

    return (
        <>
            <DialogTitle>Refund Policy</DialogTitle>
            <div className="flex justify-between items-center">
                <div>
                    <p>Listing Type: {policy.listingType}</p>
                    <p>Country: {policy.country}</p>
                </div>
                {policy.updatedDate && (
                    <div className="text-sm text-muted-foreground">
                        Last updated {formatLastUpdated(policy.updatedDate)}
                    </div>
                )}
            </div>
            <h3>Reasons</h3>
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
                    {
                        policy.reasons.map((reason) => {
                            return (
                                <CarouselItem aria-label={reason.code} key={reason.id} className="p-3">
                                    <div className="flex flex-col">
                                        <div className="flex flex-row justify-between mb-2">
                                            <h4 className="font-bold text-lg">{reason.title}</h4>
                                            { reason.confirmed ? <p aria-label="confirmed" className="text-green-500">Confirmed</p> : <p aria-label="requires-confirmation" className="bg-red-800 px-3 py-1 text-center rounded-xl text-white">Requires Confirmation</p> }
                                        </div>
                                        { !reason.no_refund &&
                                            (reason.whoPayShipping === "NOT_REQUIRED" ? <span>Payment not required, photo evidence will be asked for instead.</span>
                                            : <p><span className="font-bold">{capitalize(reason.whoPayShipping)}</span> pays for shipping.</p>)
                                        }
                                    </div>
                                    { !reason.no_refund ?
                                        <div className="flex flex-row gap-3 mt-2">
                                            <div className="flex-none w-32">
                                            <h5 className="mb-2">Timeframes</h5>
                                            <ul className="space-y-1">
                                                {
                                                    reason.tiers.map((tier) => {
                                                        return (
                                                            <li key={tier.id}>
                                                                <p><span className="text-slate-600">Within </span><span className="font-bold">{tier.daysUpTo}</span> <span className="text-slate-600">days </span><span className="font-bold">{tier.refundPercentage * 100}%</span><span className="text-slate-600"> refunded.</span></p>
                                                            </li>
                                                        )
                                                    })
                                                }
                                            </ul>
                                            </div>
                                            <div className="flex-grow">
                                            <h5>Conditions</h5>
                                            <Accordion type="single" collapsible className="w-full">
                                                {
                                                    reason.conditions.map((condition) => {
                                                        const maxDaysUpTo = Math.max(...reason.tiers.map(tier => tier.daysUpTo));
                                                        const description = condition.description.replace(/\[X\]/g, maxDaysUpTo.toString());
                                                        return (
                                                            <AccordionItem key={condition.id} value={condition.id}>
                                                                <AccordionTrigger className="font-bold text-md">{condition.title}</AccordionTrigger>
                                                                <AccordionContent>{description}</AccordionContent>
                                                            </AccordionItem>
                                                        )
                                                    })
                                                }
                                            </Accordion>
                                            </div>
                                        </div>
                                        : <p>No refunds available.</p>
                                    }
                                </CarouselItem>
                            )
                        })
                    }
                </CarouselContent>
                <div className="flex flex-row gap-3">
                    <CarouselScrollToBottom style="RECTANGLE" />
                    <CarouselNext aria-label="next-reason" className="flex-grow" style="RECTANGLE" />
                </div>
            </Carousel>
        </>
    )
}

export default ViewRefundPolicy