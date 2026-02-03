import { z } from "zod";

export type ChoiceOptionSchema = z.infer<typeof ChoiceOptionSchema>

export const ChoiceOptionSchema = z.object({
    id: z.string().min(1),
    defaultLabel: z.string().min(1),
    localizations: z.object({
        locale:  z.enum(["EN", "DE", "IND"]),
        value: z.string().min(1)
    }).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"])
})