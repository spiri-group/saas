import { z } from "zod";
import { ColorSchema } from "./colors";

export type ThumbnailSchema = z.infer<typeof ThumbnailSchema>

export const ThumbnailSchema = z.object({
    image: z.object({
        media: z.object({
            name: z.string().min(1),
            url: z.string().min(1),
            urlRelative: z.string().min(1),
            size: z.string().min(1),
            type: z.string().min(1)
        }).optional(),
        zoom: z.coerce.number(),
        objectFit: z.enum(['contain', 'cover', 'fill', 'none', 'scale-down']).optional()
    }),
    dynamicMode: z.object({
        type: z.enum(['VIDEO', 'COLLAGE']),
        video: z.object({
            media: z.object({
                name: z.string().min(1),
                url: z.string().min(1),
                urlRelative: z.string().min(1),
                size: z.string().min(1),
                type: z.string().min(1),
                durationSeconds: z.number().optional()
            }).optional(),
            autoplay: z.boolean().optional(),
            muted: z.boolean().optional()
        }).optional(),
        collage: z.object({
            images: z.array(z.object({
                name: z.string().min(1),
                url: z.string().min(1),
                urlRelative: z.string().min(1),
                size: z.string().min(1),
                type: z.string().min(1)
            })),
            transitionDuration: z.number().optional(),
            crossFade: z.boolean().optional()
        }).optional()
    }).optional(),
    title: z.object({
        content: z.string().optional(),
        panel: z.object({
            bgColor: ColorSchema.optional(),
            textColor: z.string(),
            bgOpacity: z.number()
        })
    }).optional(),
    moreInfo: z.object({
        content: z.string().optional()
    }).optional(),
    stamp: z.object({
        text: z.string().optional(),
        enabled: z.boolean(),
        bgColor: z.string(),
        textColor: z.string()
    }).optional().nullable(),
    bgColor: ColorSchema,
    panelTone: z.enum(['light', 'dark']).optional()
})


