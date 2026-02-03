'use client';

import { gql } from "@/lib/services/gql";

import { DurationSchema } from "@/shared/hooks/mutations";
import { service_type } from "@/utils/spiriverse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { countWords, omit } from "@/lib/functions";
import { CurrencyAmountSchema } from "@/components/ux/CurrencyInput";
import { accordionItemSchema } from "@/components/ux/AccordionInput";
import { ThumbnailSchema } from "@/shared/schemas/thumbnail";
import { default_thumbnail } from "@/components/ux/ThumbnailInput";

export type CreateServiceSchema = z.infer<typeof CreateServiceSchema>

export const CreateServiceSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    thumbnail: ThumbnailSchema,
    description: z.string().min(1).refine((value) => countWords(value) <= 500),
    terms: z.string().refine((value) => countWords(value) <= 500).optional(),
    faq: z.array(accordionItemSchema),
    duration: DurationSchema,
    ratePerHour: CurrencyAmountSchema,
    //availableUntil: DateRangeSchema,
    //requireAppointment: z.boolean()
})

const UseCreateService = (merchantId: string) => {
    const queryClient = useQueryClient();

    const serviceId = uuid();

    const form = useForm<CreateServiceSchema>({
        resolver: zodResolver(CreateServiceSchema),
        defaultValues: {
            id: serviceId,
            faq: [],
            ratePerHour: {
                currency: "AUD",
                amount: undefined
            },
            thumbnail: default_thumbnail
        }
    })

    return {
        form, 
        values: form.getValues(),
        schema: CreateServiceSchema,
        mutation: useMutation({
            mutationFn: async (newService: CreateServiceSchema) => {
                const service = omit(newService, ["thumbnail", "duration"]) as service_type;

                // if (availableUntil.type == "into") {
                //     service.availableUntil = {
                //         type: availableUntil.type,
                //         intoTheFuture: {
                //             amount: newService.availableUntil.intoTheFuture.amount,
                //             unitId: newService.availableUntil.intoTheFuture.unit?.id
                //         }
                //     }
                // } else if (availableUntil.type == "within") {
                //     service.availableUntil = {
                //         type: availableUntil.type,
                //         range: availableUntil.range
                //     }
                // } else {
                //     service.availableUntil = {
                //         type: availableUntil.type
                //     }
                // }

                // service.duration = {
                //     amount: newService.duration.amount,
                //     unitId: newService.duration.unit.id
                // }

                const resp = await gql<any>(
                    `
                    mutation create_service($merchantId: String!, $service: ServiceInput!) { 
                        create_service(merchantId: $merchantId, service: $service) {
                            service {
                                id
                            }
                        }
                    }
                    `,
                    {
                        service,
                        merchantId
                    }
                )
        
                return resp.create_service.service;
            },
            onSuccess: async (data : service_type) => {
                queryClient.setQueryData(["services-for-merchant", { merchantId }], (old: service_type[]) => {
                    if (old == undefined) return [data];
                    return [data, ...old];
                });
            }
        })
    }
}

export default UseCreateService;