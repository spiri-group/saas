'use client';

import { gql } from "@/lib/services/gql";

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form"
import { z } from "zod"
import { selectedActivityListSchema, selectedTicketListSchema } from "../components/ChooseActivityAndTicketList";

export type formSchemaType = z.infer<typeof formSchema>

const scheduleSchema = z.object({
    recurrenceRule: z.string().optional(),
    dates: z.array(z.string()).optional(),
    name: z.string().optional(),
    capacity: z.coerce.number().min(1),
    activityList: selectedActivityListSchema,
    ticketList: selectedTicketListSchema
}).refine((data) => {
    if (data.recurrenceRule != null && data.dates != null) {
        return false
    } else if (data.recurrenceRule == null && data.dates == null) {
        return false
    } else {
        return true
    }
})

const formSchema = z.object({
    vendorId: z.string().uuid(),
    listing: z.object({
        id: z.string().uuid(),
        name: z.string(),
    }),
    schedule: scheduleSchema
})

const UseScheduleSession = (vendorId: string) => {
    const queryClient = useQueryClient();

    const form = useForm<formSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            vendorId: vendorId,
            listing: undefined,
            schedule: {
                recurrenceRule: undefined,
                dates: undefined,
                name: undefined,
                capacity: 10,
                activityList: undefined,
                ticketList: undefined
            }
        }
    })

    return {
        form,
        values: form.getValues(),
        mutation: useMutation({
            mutationFn: async (values: formSchemaType) => {

                const resp = await gql<any>(`
                        mutation schedule_listing($schedule: ListingScheduleInput!) {
                        schedule_listing(vendorId: "${values.vendorId}", listingId: "${values.listing.id}", schedule: $schedule) {
                            code,
                            success,
                            message,
                                schedule {
                                    id,
                                    capacity,
                                    recurrenceRule,
                                    fromTime, 
                                    toTime,
                                    listingId
                                }
                            }
                        }
                    `,
                    {
                        schedule: {
                            dates: values.schedule.dates,
                            capacity: values.schedule.capacity,
                            recurrenceRule: values.schedule.recurrenceRule,
                            activityListId: values.schedule.activityList.id,
                            ticketListId: values.schedule.ticketList.id
                        }
                    }
                )

                return resp.schedule_listing.schedule;
            },
            onSuccess: async () => {
                queryClient.invalidateQueries({
                    queryKey: ["sessions", vendorId]
                })
                queryClient.invalidateQueries({
                    queryKey: ["sessions-summary", vendorId]
                })
            }
        })
    }
}

export default UseScheduleSession