import { z } from 'zod';
export const HarmonizedSystemCodeSchema = z.object({
    hsCode: z.string(),
    formattedHsCode: z.string(),
    description: z.string(),
});
export type HarmonizedSystemCode = z.infer<typeof HarmonizedSystemCodeSchema>;