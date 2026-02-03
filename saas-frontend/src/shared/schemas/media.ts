import { z } from "zod";

export type MediaSchema = z.infer<typeof MediaSchema>

export const MediaSchema = z.object({
    name: z.string().min(1),
    url: z.string().min(1),
    urlRelative: z.string().min(1),
    size: z.string().min(1),
    type: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    hashtags: z.array(z.string()).optional(),
    sizeBytes: z.number().optional(),
    durationSeconds: z.number().optional()
})