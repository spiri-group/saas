import { z } from "zod";

/**
 * Block Type - Atomic block types for email content
 */
export const BlockType = z.enum(["text", "image", "button", "table", "social", "infoCard", "dividerBlock", "spacer", "hero"]);
export type BlockType = z.infer<typeof BlockType>;

/**
 * Content Block - A reusable piece of content
 */
export const ContentBlockSchema = z.object({
  id: z.string(),
  blockType: BlockType.default("text"),
  label: z.string().optional(), // User-friendly label for the block

  // Text block fields
  title: z.string().optional(),
  titleAlign: z.enum(["left", "center", "right"]).optional().default("left"),
  titleSize: z.enum(["small", "medium", "large", "xlarge"]).optional().default("large"),

  subtitle: z.string().optional(),
  subtitleAlign: z.enum(["left", "center", "right"]).optional().default("left"),
  subtitleSize: z.enum(["small", "medium", "large"]).optional().default("medium"),

  description: z.string().optional(),
  descriptionAlign: z.enum(["left", "center", "right", "justify"]).optional().default("justify"),

  isQuote: z.boolean().optional().default(false),

  // Image block fields
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  imageLink: z.string().optional(), // URL to navigate to when image is clicked

  // Button block fields
  buttonText: z.string().optional(),
  buttonUrl: z.string().optional(),
  buttonStyle: z.enum(["primary", "secondary", "outline"]).optional(),
  buttonAlign: z.enum(["left", "center", "right", "full"]).optional().default("full"),

  // Text block font controls
  textFontFamily: z.enum(["default", "serif", "sans-serif", "monospace", "Georgia", "Arial", "Verdana", "Courier New"]).optional(),
  textFontSize: z.number().optional(),

  // Text block styling
  textBgColor: z.string().optional(),
  textBorderColor: z.string().optional(),
  textBorderRadius: z.number().optional().default(0),
  textPadding: z.number().optional().default(0),

  // Info Card block fields
  infoCardItems: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.string(),
  })).optional(),
  infoCardStyle: z.enum(["default", "outlined", "filled", "accent"]).optional().default("default"),
  infoCardBgColor: z.string().optional(),
  infoCardBorderColor: z.string().optional(),

  // Divider block fields
  dividerBlockStyle: z.enum(["solid", "dashed", "dotted", "gradient"]).optional().default("solid"),
  dividerBlockColor: z.string().optional().default("#e2e8f0"),
  dividerBlockHeight: z.number().optional().default(1),
  dividerBlockWidth: z.number().optional().default(100),

  // Spacer block fields
  spacerHeight: z.number().optional().default(20),

  // Hero/Banner block fields
  heroBgColor: z.string().optional().default("#6b21a8"),
  heroBgImage: z.string().optional(),
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroTextColor: z.string().optional().default("#ffffff"),
  heroMinHeight: z.number().optional().default(200),
  heroTextAlign: z.enum(["left", "center", "right"]).optional().default("center"),

  // Hero button fields
  heroButtonText: z.string().optional(),
  heroButtonUrl: z.string().optional(),
  heroButtonStyle: z.enum(["primary", "secondary", "outline"]).optional().default("primary"),

  // Table block fields
  tableColumns: z.array(z.object({
    id: z.string(),
    header: z.string(),
    field: z.string(), // Variable path like "item.descriptor" or "item.quantity"
    align: z.enum(["left", "center", "right"]).optional().default("left"),
  })).optional(),
  tableDataSource: z.string().optional(), // e.g., "order.lines" or "refund.lines"
  tableRowLimit: z.number().optional(), // Top N rows to display
  tableShowMoreText: z.string().optional(), // e.g., "...and {count} more items"
  tableStyle: z.object({
    showBorders: z.boolean().optional().default(true),
    alternatingRows: z.boolean().optional().default(true),
    headerBold: z.boolean().optional().default(true),
  }).optional(),

  // Social block fields
  socialFacebookUrl: z.string().optional(),
  socialXUrl: z.string().optional(),
  socialInstagramUrl: z.string().optional(),
  socialLinkedinUrl: z.string().optional(),
  socialYoutubeUrl: z.string().optional(),
  socialTiktokUrl: z.string().optional(),
  socialIconSize: z.number().optional().default(32), // Icon size in pixels
  socialAlign: z.enum(["left", "center", "right"]).optional().default("center"),
});

export type ContentBlock = z.infer<typeof ContentBlockSchema>;

/**
 * Layout Templates - Predefined layouts based on number of blocks
 */
export const LayoutType = z.enum([
  "single-full",           // 1 block - full width
  "two-column",            // 2 blocks - side by side
  "two-stacked",           // 2 blocks - stacked
  "three-column",          // 3 blocks - 3 columns
  "three-stacked",         // 3 blocks - stacked vertically
  "hero-two-column",       // 3 blocks - 1 large + 2 small
  "two-top-stacked",       // 3 blocks - 2 on top + 1 on bottom
  "four-grid",             // 4 blocks - 2x2 grid
  "hero-three-column",     // 4 blocks - 1 large + 3 small
  "five-grid",             // 5 blocks - mixed layout
  "six-grid",              // 6 blocks - 3x2 grid
]);

export type LayoutType = z.infer<typeof LayoutType>;

/**
 * Divider - A horizontal or vertical separator line
 */
export const DividerSchema = z.object({
  id: z.string(),
  orientation: z.enum(["horizontal", "vertical"]),
  position: z.number(), // Position index in the layout
  span: z.number(), // How many columns/rows to span
  style: z.object({
    color: z.string().optional().default("#000000"),
    height: z.number().optional().default(1), // in pixels
    margin: z.number().optional().default(20), // in pixels
  }).optional(),
});

export type Divider = z.infer<typeof DividerSchema>;

/**
 * Layout configuration with slots for content blocks
 */
export const EmailLayoutSchema = z.object({
  type: LayoutType,
  slots: z.record(z.string()), // Map of slotId -> contentBlockId
  slotWidths: z.record(z.number()).optional(), // Map of slotId -> width percentage (e.g., {"left": 30, "right": 70})
  spacerPositions: z.record(z.number()).optional(), // Map of rowIndex -> spacer position index in that row
  dividers: z.array(DividerSchema).optional().default([]), // Dividers inserted in the layout
  backgroundColor: z.string().optional(), // Background color for the entire layout/row
  backgroundImage: z.string().optional(), // Background image URL
  padding: z.object({
    top: z.number().optional().default(20),
    bottom: z.number().optional().default(20),
    left: z.number().optional().default(20),
    right: z.number().optional().default(20),
  }).optional(),
});

export type EmailLayout = z.infer<typeof EmailLayoutSchema>;

/**
 * Complete email structure
 */
export const ColorSwatchSchema = z.object({
  id: z.string(),
  label: z.string(),
  color: z.string(),
});

export type ColorSwatch = z.infer<typeof ColorSwatchSchema>;

export const EmailStructureSchema = z.object({
  contentBlocks: z.array(ContentBlockSchema),
  layout: EmailLayoutSchema.optional(),
  colorPalette: z.array(ColorSwatchSchema).optional(),
});

export type EmailStructure = z.infer<typeof EmailStructureSchema>;

/**
 * Layout definitions with slot configurations
 */
export interface LayoutDefinition {
  type: LayoutType;
  name: string;
  description: string;
  minBlocks: number;
  maxBlocks: number;
  slots: {
    id: string;
    label: string;
    size: "small" | "medium" | "large" | "full";
  }[];
}

export const LAYOUT_DEFINITIONS: LayoutDefinition[] = [
  {
    type: "single-full",
    name: "Single Block",
    description: "One full-width content block",
    minBlocks: 1,
    maxBlocks: 1,
    slots: [{ id: "main", label: "Main Content", size: "full" }],
  },
  {
    type: "two-column",
    name: "Two Columns",
    description: "Two blocks side by side",
    minBlocks: 2,
    maxBlocks: 2,
    slots: [
      { id: "left", label: "Left", size: "medium" },
      { id: "right", label: "Right", size: "medium" },
    ],
  },
  {
    type: "two-stacked",
    name: "Two Stacked",
    description: "Two blocks stacked vertically",
    minBlocks: 2,
    maxBlocks: 2,
    slots: [
      { id: "top", label: "Top", size: "full" },
      { id: "bottom", label: "Bottom", size: "full" },
    ],
  },
  {
    type: "three-column",
    name: "Three Columns",
    description: "Three blocks in a row",
    minBlocks: 3,
    maxBlocks: 3,
    slots: [
      { id: "left", label: "Left", size: "small" },
      { id: "center", label: "Center", size: "small" },
      { id: "right", label: "Right", size: "small" },
    ],
  },
  {
    type: "three-stacked",
    name: "Three Stacked",
    description: "Three blocks stacked vertically",
    minBlocks: 3,
    maxBlocks: 3,
    slots: [
      { id: "top", label: "Top", size: "full" },
      { id: "middle", label: "Middle", size: "full" },
      { id: "bottom", label: "Bottom", size: "full" },
    ],
  },
  {
    type: "hero-two-column",
    name: "Hero + Two Columns",
    description: "One large block with two smaller blocks below",
    minBlocks: 3,
    maxBlocks: 3,
    slots: [
      { id: "hero", label: "Hero", size: "full" },
      { id: "left", label: "Left", size: "medium" },
      { id: "right", label: "Right", size: "medium" },
    ],
  },
  {
    type: "two-top-stacked",
    name: "Two Top + Stacked",
    description: "Two blocks on top with one full-width below",
    minBlocks: 3,
    maxBlocks: 3,
    slots: [
      { id: "top-left", label: "Top Left", size: "medium" },
      { id: "top-right", label: "Top Right", size: "medium" },
      { id: "bottom", label: "Bottom", size: "full" },
    ],
  },
  {
    type: "four-grid",
    name: "Four Grid",
    description: "Four blocks in a 2x2 grid",
    minBlocks: 4,
    maxBlocks: 4,
    slots: [
      { id: "top-left", label: "Top Left", size: "medium" },
      { id: "top-right", label: "Top Right", size: "medium" },
      { id: "bottom-left", label: "Bottom Left", size: "medium" },
      { id: "bottom-right", label: "Bottom Right", size: "medium" },
    ],
  },
  {
    type: "hero-three-column",
    name: "Hero + Three Columns",
    description: "One large block with three smaller blocks below",
    minBlocks: 4,
    maxBlocks: 4,
    slots: [
      { id: "hero", label: "Hero", size: "full" },
      { id: "left", label: "Left", size: "small" },
      { id: "center", label: "Center", size: "small" },
      { id: "right", label: "Right", size: "small" },
    ],
  },
];

/**
 * Helper function to get suggested layouts based on number of blocks
 */
export function getSuggestedLayouts(blockCount: number): LayoutDefinition[] {
  return LAYOUT_DEFINITIONS.filter(
    (layout) => blockCount >= layout.minBlocks && blockCount <= layout.maxBlocks
  );
}

/**
 * Helper function to create a new content block
 */
export function createContentBlock(id?: string, blockType: BlockType = "text"): ContentBlock {
  return ContentBlockSchema.parse({
    id: id || crypto.randomUUID(),
    blockType,
  });
}
