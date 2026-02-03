import { z } from "zod";
import { TextFormatSchema } from "@/components/ux/TextFormatterInput";

/**
 * Content element schema for title, subtitle, or description
 */
export const ContentElementSchema = z.object({
  content: z.string(),
  format: TextFormatSchema
});

export type ContentElement = z.infer<typeof ContentElementSchema>;

/**
 * Cell content schema - each cell can have title, subtitle, and description
 */
export const CellContentSchema = z.object({
  title: ContentElementSchema.optional(),
  subtitle: ContentElementSchema.optional(),
  description: ContentElementSchema.optional(),
  backgroundColor: z.string().optional(),
  backgroundImage: z.string().optional(),
  padding: z.object({
    top: z.number().min(0),
    right: z.number().min(0),
    bottom: z.number().min(0),
    left: z.number().min(0)
  }).optional()
});

export type CellContent = z.infer<typeof CellContentSchema>;

/**
 * Grid cell schema - represents a single cell in the grid
 */
export const GridCellSchema = z.object({
  id: z.string(),
  content: CellContentSchema,
  // Layout properties
  direction: z.enum(["horizontal", "vertical"]).optional(),
  children: z.array(z.lazy(() => GridCellSchema)).optional()
});

export type GridCell = z.infer<typeof GridCellSchema>;

/**
 * Root grid structure schema
 */
export const GridStructureSchema = z.object({
  rootCell: GridCellSchema
});

export type GridStructure = z.infer<typeof GridStructureSchema>;

/**
 * Helper function to create a new empty cell
 */
export function createEmptyCell(id?: string): GridCell {
  return {
    id: id || crypto.randomUUID(),
    content: {
      padding: { top: 16, right: 16, bottom: 16, left: 16 }
    }
  };
}

/**
 * Helper function to create a default content element
 */
export function createDefaultContentElement(content: string = ""): ContentElement {
  return {
    content,
    format: {
      family: "clean",
      size: "medium",
      color: "#000000",
      backgroundColor: "transparent",
      bold: false,
      italic: false,
      alignment: "left",
      decoration: "none",
      case: "none",
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      withQuotes: false,
      borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 }
    }
  };
}
