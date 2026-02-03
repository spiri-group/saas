import { z } from "zod";

export const RecordRefSchema = z.object({
    id: z.string(),
    partition: z.string().or(z.array(z.string())),
    container: z.string()
})