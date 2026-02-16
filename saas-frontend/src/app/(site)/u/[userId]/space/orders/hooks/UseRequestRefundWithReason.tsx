'use client';

import { gql } from "@/lib/services/gql";
import { order_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import { EligibleReason } from "./UseRefundEligibility";
import { MediaSchema } from "@/shared/schemas/media";

export type requestRefundWithReasonSchema = z.infer<typeof requestRefundWithReasonSchema>

export const requestRefundWithReasonSchema = z.object({
    id: z.string().uuid(),
    reasonId: z.string().optional(),
    reasonCode: z.string().optional(),
    reasonTitle: z.string().optional(),
    refundPercentage: z.number().min(0).max(1).optional(),
    evidencePhotos: z.array(MediaSchema).optional(),
    evidenceVideos: z.array(MediaSchema).optional(),
    lines: z.array(z.object({
        id: z.string().uuid(),
        descriptor: z.string(),
        price: CurrencyAmountSchema,
        quantity: z.coerce.number(),
        refund_status: z.enum(["FULL", "PARTIAL"]).nullable(),
        refund_quantity: z.coerce.number()
    }))
})

const UseRequestRefundWithReason = (order: order_type, existingRefundRequest?: any) => {

    const form = useForm<z.infer<typeof requestRefundWithReasonSchema>>({
        resolver: zodResolver(requestRefundWithReasonSchema),
        defaultValues: 
        existingRefundRequest != null 
        && !["CANCELLED", "REJECTED"].includes(existingRefundRequest.status)
         ? ({
            id: existingRefundRequest.id,
            reasonId: undefined,
            reasonCode: undefined,
            reasonTitle: undefined,
            refundPercentage: undefined,
            evidencePhotos: existingRefundRequest.evidencePhotos || [],
            evidenceVideos: existingRefundRequest.evidenceVideos || [],
            lines: existingRefundRequest.lines.map((line) => ({
                ...line,
                refund_quantity: line.refund_status == "REJECTED" ? 0 : line.refund_quantity,
                refund_status: line.refund_status == "REJECTED" ? null : line.refund_status
            }))
         } as any) : {
            id: uuid(),
            reasonId: undefined,
            reasonCode: undefined,
            reasonTitle: undefined,
            refundPercentage: undefined,
            evidencePhotos: [],
            evidenceVideos: [],
            lines: order.lines.map((orderLine) => {
                return {
                    id: orderLine.id,
                    descriptor: orderLine.descriptor,
                    price: orderLine.price,
                    quantity: orderLine.quantity,
                    refund_status: null,
                    refund_quantity: 0
                }
            })
        }
    })

    const applyReason = (reason: EligibleReason) => {
        form.setValue('reasonId', reason.id);
        form.setValue('reasonCode', reason.code);
        form.setValue('reasonTitle', reason.title);
        form.setValue('refundPercentage', reason.applicableTier?.refundPercentage || 0);

        // Don't automatically change quantities when applying a reason
        // Let the user choose their own quantities regardless of refund percentage
        const currentLines = form.getValues().lines;
        const updatedLines = currentLines.map(line => {
            // Keep existing refund quantities but clear status to let user decide
            return {
                ...line,
                refund_status: line.refund_quantity === line.quantity ? "FULL" as const : 
                              line.refund_quantity > 0 ? "PARTIAL" as const : null
            };
        });

        form.setValue('lines', updatedLines);
    };

    return {
        form, 
        values: form.getValues(),
        applyReason,
        mutation: useMutation({
            mutationFn: async (values: requestRefundWithReasonSchema) => {
                const resp = await gql<{
                    upsert_request_refund: {
                        order: {
                            refundRequest: {
                                id: string;
                                status: string;
                                lines: {
                                    id: string;
                                    descriptor: string;
                                    price: {
                                        amount: number;
                                        currency: string;
                                    };
                                    quantity: number;
                                    refund_quantity: number;
                                    refund_status: string | null;
                                }[];
                            }
                        }
                    }
                }>(
                    `mutation upsert_request_refund($orderRef: RecordRefInput, $lines: [OrderLineRefundInput], $reasonId: String, $evidencePhotos: [MediaInput], $evidenceVideos: [MediaInput]) {
                        upsert_request_refund(orderRef: $orderRef, lines: $lines, reasonId: $reasonId, evidencePhotos: $evidencePhotos, evidenceVideos: $evidenceVideos) {
                            order {
                                id
                            }
                        }
                    }
                    `,
                    {
                        orderRef: order.ref,
                        lines: values.lines
                            .filter(line => line.refund_quantity > 0)
                            .map((line) => ({
                                id: line.id,
                                refund_quantity: line.refund_quantity,
                                refund: {
                                    amount: line.refund_quantity * line.price.amount * (values.refundPercentage || 1),
                                    currency: line.price.currency
                                }
                            })),
                        reasonId: values.reasonId,
                        evidencePhotos: values.evidencePhotos,
                        evidenceVideos: values.evidenceVideos
                    }
                )
        
                return resp.upsert_request_refund.order.refundRequest;
            }
        })
    }
}

export default UseRequestRefundWithReason