import { z } from "zod"

export type durationSchema_type = z.infer<typeof DurationSchema>

export const DurationSchema = z.object({
    amount: z.coerce.number(),
    unit: z.object({
        id: z.string().min(1),
        defaultLabel: z.string().min(1)
    })
})

export type dateFromTo_type = z.infer<typeof DateFromTo>

export const DateFromTo = z.object({
    from: z.coerce.date(),
    to: z.coerce.date()
})