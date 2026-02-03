import { z } from "zod";

// Define a schema for colors that supports both solid colors and gradients
export const ColorSchema = z.union([
    z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color"), // Hex color
    z.string().regex(/^(linear-gradient|radial-gradient)\(.*\)$/, "Invalid gradient"), // Gradient
]);

export const gradients = (direction: 'to right' | 'to left' | 'to top' | 'to bottom') => [
    { label: "megatron", value: `linear-gradient(${direction}, rgb(198, 255, 221), rgb(251, 215, 134), rgb(247, 121, 125))`},
    { label: "moonlit asteroid", value: `linear-gradient(${direction}, rgb(15, 32, 39), rgb(32, 58, 67), rgb(44, 83, 100))`},
    { label: "sunset", value: `linear-gradient(${direction}, rgb(255, 94, 77), rgb(255, 194, 77), rgb(255, 255, 77))`},
    { label: "ocean breeze", value: `linear-gradient(${direction}, rgb(0, 204, 255), rgb(0, 153, 255), rgb(0, 102, 255))`},
    { label: "forest", value: `linear-gradient(${direction}, rgb(34, 193, 195), rgb(253, 187, 45))`},
    { label: "sunrise", value: `linear-gradient(${direction}, rgb(253, 187, 45), rgb(252, 69, 192))`},
    { label: "purple haze", value: `linear-gradient(${direction}, rgb(255, 0, 255), rgb(0, 0, 255))`},
    { label: "blue lagoon", value: `linear-gradient(${direction}, rgb(0, 204, 255), rgb(0, 153, 255))`},
    { label: "pink lemonade", value: `linear-gradient(${direction}, rgb(255, 105, 180), rgb(255, 182, 193))`},
    { label: "chocolate mint", value: `linear-gradient(${direction}, rgb(85, 239, 196), rgb(129, 236, 236))`},
]

export type ColorSchema = z.infer<typeof ColorSchema>;

