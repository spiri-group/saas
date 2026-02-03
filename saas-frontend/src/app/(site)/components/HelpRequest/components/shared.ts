import { z } from "zod";

const evidenceSchema = z.object({
    url: z.string().min(1),
    urlRelative: z.string().min(1)
})

export {evidenceSchema}