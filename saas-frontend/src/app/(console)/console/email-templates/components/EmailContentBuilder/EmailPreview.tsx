"use client";

import { EmailStructure, LAYOUT_DEFINITIONS, ContentBlock } from "./types";
import { Mail } from "lucide-react";
import UseEmailHeadersFooters from "../../hooks/UseEmailHeadersFooters";
import { JSX } from "react";
import { iconsMapping } from "@/icons/social";
import { IconStyle } from "@/icons/shared/types";

/**
 * Apply inline styles to list elements for email client compatibility
 * Email clients require inline CSS, not external stylesheets or utility classes
 */
const applyListInlineStyles = (html: string): string => {
  if (!html) return html;

  // Create a temporary container to parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Style ul elements
  const ulElements = doc.querySelectorAll('ul');
  ulElements.forEach((ul) => {
    ul.setAttribute('style', 'list-style-type: disc; padding-left: 20px; margin: 0;');
  });

  // Style ol elements
  const olElements = doc.querySelectorAll('ol');
  olElements.forEach((ol) => {
    ol.setAttribute('style', 'list-style-type: decimal; padding-left: 20px; margin: 0;');
  });

  // Style li elements
  const liElements = doc.querySelectorAll('li');
  liElements.forEach((li) => {
    li.setAttribute('style', 'margin-top: 4px; margin-bottom: 4px;');
  });

  return doc.body.innerHTML;
};

interface EmailPreviewProps {
  structure?: EmailStructure;
  subject?: string;
  headerId?: string;
  footerId?: string;
}

export default function EmailPreview({ structure, subject, headerId, footerId }: EmailPreviewProps) {
  const allHeadersFooters = UseEmailHeadersFooters();

  const header = headerId ? allHeadersFooters.data?.find(h => h.id === headerId && h.type === "header") : undefined;
  const footer = footerId ? allHeadersFooters.data?.find(f => f.id === footerId && f.type === "footer") : undefined;

  if (!structure || !structure.layout) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <Mail className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No Preview Available</p>
        <p className="text-sm text-center">
          Create content blocks and choose a layout to see preview
        </p>
      </div>
    );
  }

  const layoutDef = LAYOUT_DEFINITIONS.find(l => l.type === structure.layout?.type);
  const slots = structure.layout.slots || {};
  const slotWidths = structure.layout.slotWidths || {};

  // Parse header and footer content if they exist
  let headerStructure: EmailStructure | undefined;
  let footerStructure: EmailStructure | undefined;

  try {
    if (header?.content) {
      headerStructure = JSON.parse(header.content) as EmailStructure;
    }
    if (footer?.content) {
      footerStructure = JSON.parse(footer.content) as EmailStructure;
    }
  } catch (e) {
    console.error("Failed to parse header/footer content", e);
  }

  // Helper to group slots into rows
  const getSlotRows = () => {
    if (!layoutDef) return [];
    const layoutSlots = layoutDef.slots;

    if (structure.layout?.type === "hero-two-column") {
      return [
        [layoutSlots[0]], // Hero slot
        [layoutSlots[1], layoutSlots[2]] // Two columns
      ];
    } else if (structure.layout?.type === "two-top-stacked") {
      return [
        [layoutSlots[0], layoutSlots[1]], // Two columns on top
        [layoutSlots[2]] // Bottom slot
      ];
    } else if (structure.layout?.type === "hero-three-column") {
      return [
        [layoutSlots[0]], // Hero slot
        [layoutSlots[1], layoutSlots[2], layoutSlots[3]] // Three columns
      ];
    } else if (structure.layout?.type === "four-grid") {
      return [
        [layoutSlots[0], layoutSlots[1]], // First row
        [layoutSlots[2], layoutSlots[3]] // Second row
      ];
    } else if (structure.layout?.type === "three-stacked") {
      return [
        [layoutSlots[0]], // Top
        [layoutSlots[1]], // Middle
        [layoutSlots[2]]  // Bottom
      ];
    } else {
      return [layoutSlots];
    }
  };

  // Helper to render slots with spacers
  const renderSlotsWithSpacers = (rowSlots: any[], rowIndex: number) => {
    const elements: JSX.Element[] = [];

    // Calculate total width used by slots with custom widths
    let totalCustomWidth = 0;
    let slotsWithCustomWidths = 0;

    rowSlots.forEach(slot => {
      if (slotWidths[slot.id]) {
        totalCustomWidth += slotWidths[slot.id];
        slotsWithCustomWidths++;
      }
    });

    // Only add spacer if ALL slots have custom widths and they don't fill 100%
    // If some slots don't have widths, they'll use flex: 1 and fill remaining space
    const allSlotsHaveWidths = slotsWithCustomWidths === rowSlots.length;
    const spacerWidth = 100 - totalCustomWidth;
    
    // Show spacer only if:
    // 1. All slots have custom widths (otherwise flex slots will fill space)
    // 2. Total width is less than 100% (with a 1% threshold to avoid tiny spacers from rounding)
    const needsSpacer = allSlotsHaveWidths && spacerWidth > 1;

    // Get spacer position for this row (default to end)
    const spacerPositions = structure.layout?.spacerPositions || {};
    const spacerPosition = spacerPositions[rowIndex] ?? rowSlots.length; // Default to after all slots

    if (!needsSpacer) {
      // No spacer needed, just render slots
      rowSlots.forEach((slot) => {
        const blockId = slots[slot.id];
        const block = structure.contentBlocks.find(b => b.id === blockId);
        const slotWidth = slotWidths[slot.id];

        elements.push(
          <div
            key={slot.id}
            style={slotWidth ? { width: `${slotWidth}%`, flexShrink: 0 } : { flex: 1 }}
          >
            {block ? renderBlock(block) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <p className="text-slate-400 text-sm">{slot.label}</p>
                <p className="text-xs text-slate-400 mt-1">No content assigned</p>
              </div>
            )}
          </div>
        );
      });
      return elements;
    }

    // Render slots and spacer at the specified position
    for (let i = 0; i <= rowSlots.length; i++) {
      // Insert spacer at its position (invisible in preview)
      if (i === spacerPosition) {
        elements.push(
          <div
            key="spacer"
            style={{ width: `${spacerWidth}%`, flexShrink: 0 }}
          />
        );
      }

      // Insert slot at this position
      if (i < rowSlots.length) {
        const slot = rowSlots[i];
        const blockId = slots[slot.id];
        const block = structure.contentBlocks.find(b => b.id === blockId);
        const slotWidth = slotWidths[slot.id];

        elements.push(
          <div
            key={slot.id}
            style={slotWidth ? { width: `${slotWidth}%`, flexShrink: 0 } : { flex: 1 }}
          >
            {block ? renderBlock(block) : (
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <p className="text-slate-400 text-sm">{slot.label}</p>
                <p className="text-xs text-slate-400 mt-1">No content assigned</p>
              </div>
            )}
          </div>
        );
      }
    }

    return elements;
  };

  // Helper to render a content block
  const renderBlock = (block: ContentBlock) => {
    // Divider block
    if (block.blockType === "dividerBlock") {
      const style = block.dividerBlockStyle || "solid";
      const color = block.dividerBlockColor || "#e2e8f0";
      const height = block.dividerBlockHeight || 1;
      const width = block.dividerBlockWidth || 100;
      return (
        <div className="flex justify-center" style={{ padding: "8px 0" }}>
          <div
            style={{
              width: `${width}%`,
              height: `${height}px`,
              borderTop: style !== "gradient"
                ? `${height}px ${style} ${color}`
                : undefined,
              background: style === "gradient"
                ? `linear-gradient(to right, transparent, ${color}, transparent)`
                : undefined,
            }}
          />
        </div>
      );
    }

    // Spacer block
    if (block.blockType === "spacer") {
      return <div style={{ height: `${block.spacerHeight || 20}px` }} />;
    }

    // Hero/Banner block
    if (block.blockType === "hero") {
      return (
        <div
          style={{
            backgroundColor: block.heroBgColor || "#6b21a8",
            backgroundImage: block.heroBgImage ? `url(${block.heroBgImage})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            minHeight: `${block.heroMinHeight || 200}px`,
            color: block.heroTextColor || "#ffffff",
            textAlign: (block.heroTextAlign || "center") as React.CSSProperties["textAlign"],
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "24px",
            borderRadius: "8px",
          }}
        >
          {block.heroTitle && (
            <h2 className="text-2xl font-bold mb-2">{block.heroTitle}</h2>
          )}
          {block.heroSubtitle && (
            <p className="text-base opacity-90">{block.heroSubtitle}</p>
          )}
          {block.heroButtonText && block.heroButtonUrl && (
            <div style={{ marginTop: "16px" }}>
              <a
                href={block.heroButtonUrl}
                style={{
                  display: "inline-block",
                  padding: "10px 24px",
                  borderRadius: "6px",
                  fontWeight: 600,
                  textDecoration: "none",
                  fontSize: "14px",
                  ...(block.heroButtonStyle === "secondary"
                    ? { backgroundColor: "rgba(255,255,255,0.2)", color: block.heroTextColor || "#ffffff", border: "1px solid rgba(255,255,255,0.3)" }
                    : block.heroButtonStyle === "outline"
                    ? { backgroundColor: "transparent", color: block.heroTextColor || "#ffffff", border: `2px solid ${block.heroTextColor || "#ffffff"}` }
                    : { backgroundColor: "#ffffff", color: block.heroBgColor || "#6b21a8" }),
                }}
              >
                {block.heroButtonText}
              </a>
            </div>
          )}
        </div>
      );
    }

    // Info Card block
    if (block.blockType === "infoCard") {
      const cardStyle = block.infoCardStyle || "default";
      const bgColor = block.infoCardBgColor || (cardStyle === "filled" ? "#f3e8ff" : "#f8fafc");
      const borderColor = block.infoCardBorderColor || "#e2e8f0";
      return (
        <div
          style={{
            backgroundColor: bgColor,
            border: (cardStyle === "outlined" || cardStyle === "default")
              ? `1px solid ${borderColor}`
              : cardStyle === "filled"
              ? "none"
              : undefined,
            borderLeft: cardStyle === "accent"
              ? `4px solid ${borderColor}`
              : undefined,
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          {block.infoCardItems && block.infoCardItems.length > 0 ? (
            <div className="space-y-2">
              {block.infoCardItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{item.label}</span>
                  <span className="text-slate-900 font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center">Empty info card</p>
          )}
        </div>
      );
    }

    // Font family mapping
    const getFontFamily = (family?: string): string | undefined => {
      if (!family || family === "default") return undefined;
      return family;
    };

    // Text block styling wrapper
    const textStyle: React.CSSProperties | undefined =
      block.blockType === "text" && (block.textBgColor || block.textBorderColor || block.textBorderRadius || block.textPadding || block.textFontFamily || block.textFontSize)
        ? {
            backgroundColor: block.textBgColor || undefined,
            border: block.textBorderColor ? `1px solid ${block.textBorderColor}` : undefined,
            borderRadius: block.textBorderRadius ? `${block.textBorderRadius}px` : undefined,
            padding: block.textPadding ? `${block.textPadding}px` : undefined,
            fontFamily: getFontFamily(block.textFontFamily) || undefined,
            fontSize: block.textFontSize ? `${block.textFontSize}px` : undefined,
          }
        : undefined;

    return (
      <div style={textStyle}>
      <div className={`space-y-3 ${block.blockType === "text" && block.isQuote ? 'border-l-4 border-purple-600 pl-4 italic' : ''}`}>
        {/* Media First (if exists) */}
        {block.imageUrl && (
          <div className="rounded-lg overflow-hidden">
            {block.imageLink ? (
              <a href={block.imageLink} target="_blank" rel="noopener noreferrer">
                <img
                  src={block.imageUrl}
                  alt={block.imageAlt || block.title || ""}
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).alt = 'Image failed to load';
                  }}
                />
              </a>
            ) : (
              <img
                src={block.imageUrl}
                alt={block.imageAlt || block.title || ""}
                className="w-full h-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).alt = 'Image failed to load';
                }}
              />
            )}
          </div>
        )}

        {/* Text Content */}
        {block.title && (
          <h2 className={`
            font-bold text-slate-900
            ${block.titleAlign === "center" ? "text-center" : ""}
            ${block.titleAlign === "right" ? "text-right" : ""}
            ${block.titleSize === "small" ? "text-lg" : ""}
            ${block.titleSize === "medium" ? "text-xl" : ""}
            ${block.titleSize === "large" || !block.titleSize ? "text-2xl" : ""}
            ${block.titleSize === "xlarge" ? "text-3xl" : ""}
          `}>
            {block.title}
          </h2>
        )}

        {block.subtitle && (
          <h3 className={`
            font-semibold text-slate-700
            ${block.subtitleAlign === "center" ? "text-center" : ""}
            ${block.subtitleAlign === "right" ? "text-right" : ""}
            ${block.subtitleSize === "small" ? "text-sm" : ""}
            ${block.subtitleSize === "medium" || !block.subtitleSize ? "text-base" : ""}
            ${block.subtitleSize === "large" ? "text-lg" : ""}
          `}>
            {block.subtitle}
          </h3>
        )}

        {block.description && (
          <div
            className={`
              text-slate-600 leading-relaxed
              ${block.descriptionAlign === "center" ? "text-center" : ""}
              ${block.descriptionAlign === "right" ? "text-right" : ""}
              ${block.descriptionAlign === "justify" || !block.descriptionAlign ? "text-justify" : ""}
            `}
            dangerouslySetInnerHTML={{ __html: applyListInlineStyles(block.description) }}
          />
        )}

        {/* Button */}
        {block.buttonText && block.buttonUrl && (
          <div className={`mt-4
            ${(block.buttonAlign || "full") === "left" ? "text-left" : ""}
            ${(block.buttonAlign || "full") === "center" ? "text-center" : ""}
            ${(block.buttonAlign || "full") === "right" ? "text-right" : ""}
          `}>
            <a
              href={block.buttonUrl}
              className={`
                ${(block.buttonAlign || "full") === "full" ? "block w-full" : "inline-block"}
                text-center px-6 py-3 rounded-lg font-medium transition-colors
                ${block.buttonStyle === "primary"
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : block.buttonStyle === "secondary"
                  ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                  : "border-2 border-slate-900 text-slate-900 hover:bg-slate-50"
                }
              `}
            >
              {block.buttonText}
            </a>
          </div>
        )}

        {/* Social Networks */}
        {block.blockType === "social" && (
          <div className={`
            flex flex-wrap gap-3 mt-4
            ${block.socialAlign === "center" ? "justify-center" : ""}
            ${block.socialAlign === "right" ? "justify-end" : ""}
          `}>
            {block.socialFacebookUrl && (
              <a
                href={block.socialFacebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <div style={{ width: `${block.socialIconSize || 32}px`, height: `${block.socialIconSize || 32}px` }}>
                  {iconsMapping.facebook(IconStyle.Fill)}
                </div>
              </a>
            )}
            {block.socialXUrl && (
              <a
                href={block.socialXUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <div style={{ width: `${block.socialIconSize || 32}px`, height: `${block.socialIconSize || 32}px` }}>
                  {iconsMapping.x(IconStyle.Fill)}
                </div>
              </a>
            )}
            {block.socialInstagramUrl && (
              <a
                href={block.socialInstagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <div style={{ width: `${block.socialIconSize || 32}px`, height: `${block.socialIconSize || 32}px` }}>
                  {iconsMapping.instagram(IconStyle.Fill)}
                </div>
              </a>
            )}
            {block.socialLinkedinUrl && (
              <a
                href={block.socialLinkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <div style={{ width: `${block.socialIconSize || 32}px`, height: `${block.socialIconSize || 32}px` }}>
                  {iconsMapping.linkedin(IconStyle.Fill)}
                </div>
              </a>
            )}
            {block.socialYoutubeUrl && (
              <a
                href={block.socialYoutubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <div style={{ width: `${block.socialIconSize || 32}px`, height: `${block.socialIconSize || 32}px` }}>
                  {iconsMapping.youtube(IconStyle.Fill)}
                </div>
              </a>
            )}
            {block.socialTiktokUrl && (
              <a
                href={block.socialTiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <div style={{ width: `${block.socialIconSize || 32}px`, height: `${block.socialIconSize || 32}px` }}>
                  {iconsMapping.tiktok(IconStyle.Fill)}
                </div>
              </a>
            )}
          </div>
        )}
      </div>
      </div>
    );
  };

  // Helper to render an entire structure with its layout
  const renderStructure = (emailStructure: EmailStructure) => {
    if (!emailStructure.layout) {
      // No layout - just render blocks sequentially
      return emailStructure.contentBlocks.map((block) => (
        <div key={block.id} className="mb-4">
          {renderBlock(block)}
        </div>
      ));
    }

    const layoutDef = LAYOUT_DEFINITIONS.find(l => l.type === emailStructure.layout?.type);
    if (!layoutDef) {
      return emailStructure.contentBlocks.map((block) => (
        <div key={block.id} className="mb-4">
          {renderBlock(block)}
        </div>
      ));
    }

    const slots = emailStructure.layout.slots || {};
    const slotWidths = emailStructure.layout.slotWidths || {};

    // Get slot rows for this structure
    const getStructureSlotRows = () => {
      const layoutSlots = layoutDef.slots;

      if (emailStructure.layout?.type === "hero-two-column") {
        return [
          [layoutSlots[0]], // Hero slot
          [layoutSlots[1], layoutSlots[2]] // Two columns
        ];
      } else if (emailStructure.layout?.type === "two-top-stacked") {
        return [
          [layoutSlots[0], layoutSlots[1]], // Two columns on top
          [layoutSlots[2]] // Bottom slot
        ];
      } else if (emailStructure.layout?.type === "hero-three-column") {
        return [
          [layoutSlots[0]], // Hero slot
          [layoutSlots[1], layoutSlots[2], layoutSlots[3]] // Three columns
        ];
      } else if (emailStructure.layout?.type === "four-grid") {
        return [
          [layoutSlots[0], layoutSlots[1]], // First row
          [layoutSlots[2], layoutSlots[3]] // Second row
        ];
      } else if (emailStructure.layout?.type === "three-stacked") {
        return [
          [layoutSlots[0]], // Top
          [layoutSlots[1]], // Middle
          [layoutSlots[2]]  // Bottom
        ];
      } else {
        return [layoutSlots];
      }
    };

    const structureSlotRows = getStructureSlotRows();
    const shouldStack = emailStructure.layout?.type === "two-stacked" || emailStructure.layout?.type === "three-stacked";

    // Helper to render slots with spacers for header/footer structures
    const renderStructureSlotsWithSpacers = (rowSlots: any[], rowIndex: number) => {
      const elements: JSX.Element[] = [];

      // Calculate total width used by slots with custom widths
      let totalCustomWidth = 0;
      let slotsWithCustomWidths = 0;

      rowSlots.forEach(slot => {
        if (slotWidths[slot.id]) {
          totalCustomWidth += slotWidths[slot.id];
          slotsWithCustomWidths++;
        }
      });

      // Only add spacer if ALL slots have custom widths and they don't fill 100%
      // If some slots don't have widths, they'll use flex: 1 and fill remaining space
      const allSlotsHaveWidths = slotsWithCustomWidths === rowSlots.length;
      const spacerWidth = 100 - totalCustomWidth;
      
      // Show spacer only if:
      // 1. All slots have custom widths (otherwise flex slots will fill space)
      // 2. Total width is less than 100% (with a 1% threshold to avoid tiny spacers from rounding)
      const needsSpacer = allSlotsHaveWidths && spacerWidth > 1;

      // Get spacer position for this row (default to end)
      const spacerPositions = emailStructure.layout?.spacerPositions || {};
      const spacerPosition = spacerPositions[rowIndex] ?? rowSlots.length; // Default to after all slots

      if (!needsSpacer) {
        // No spacer needed, just render slots
        rowSlots.forEach((slot) => {
          const blockId = slots[slot.id];
          const block = emailStructure.contentBlocks.find(b => b.id === blockId);
          const slotWidth = slotWidths[slot.id];

          elements.push(
            <div
              key={slot.id}
              style={slotWidth ? { width: `${slotWidth}%`, flexShrink: 0 } : { flex: 1 }}
            >
              {block && renderBlock(block)}
            </div>
          );
        });
        return elements;
      }

      // Render slots and spacer at the specified position
      for (let i = 0; i <= rowSlots.length; i++) {
        // Insert spacer at its position (invisible in preview)
        if (i === spacerPosition) {
          elements.push(
            <div
              key="spacer"
              style={{ width: `${spacerWidth}%`, flexShrink: 0 }}
            />
          );
        }

        // Insert slot at this position
        if (i < rowSlots.length) {
          const slot = rowSlots[i];
          const blockId = slots[slot.id];
          const block = emailStructure.contentBlocks.find(b => b.id === blockId);
          const slotWidth = slotWidths[slot.id];

          elements.push(
            <div
              key={slot.id}
              style={slotWidth ? { width: `${slotWidth}%`, flexShrink: 0 } : { flex: 1 }}
            >
              {block && renderBlock(block)}
            </div>
          );
        }
      }

      return elements;
    };

    return (
      <div className="space-y-4">
        {structureSlotRows.map((rowSlots, rowIndex) => {
          // Check if this row has any slots with custom widths
          const hasCustomWidths = rowSlots.some(slot => slotWidths[slot.id]);
          
          return (
            <div
              key={rowIndex}
              className={`flex ${hasCustomWidths ? "" : "gap-4"} ${shouldStack ? "flex-col" : "flex-row"}`}
            >
              {renderStructureSlotsWithSpacers(rowSlots, rowIndex)}
            </div>
          );
        })}
      </div>
    );
  };

  const slotRows = getSlotRows();
  const shouldStack = structure.layout?.type === "two-stacked" || structure.layout?.type === "three-stacked";

  return (
    <div className="h-full overflow-auto bg-slate-900 p-8">
      <div className="max-w-[600px] mx-auto">
        {/* Email Container - Mimics actual email styling */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Subject Line Preview */}
          {subject && (
            <div className="bg-slate-100 border-b border-slate-200 p-4">
              <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Subject</p>
              <p className="text-slate-900 font-medium">{subject}</p>
            </div>
          )}

          {/* Header */}
          {headerStructure && (
            <div className="border-b border-slate-200 bg-slate-50">
              <div className="p-6">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-3">Header: {header?.name}</p>
                {renderStructure(headerStructure)}
              </div>
            </div>
          )}

          {/* Email Body */}
          <div className="p-6">
            {layoutDef && (
              <div className="space-y-4">
                {slotRows.map((rowSlots, rowIndex) => {
                  // Check if this row has any slots with custom widths
                  const hasCustomWidths = rowSlots.some(slot => slotWidths[slot.id]);
                  
                  return (
                    <div
                      key={rowIndex}
                      className={`flex ${hasCustomWidths ? "" : "gap-4"} ${shouldStack ? "flex-col" : "flex-row"}`}
                    >
                      {renderSlotsWithSpacers(rowSlots, rowIndex)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {footerStructure && (
            <div className="border-t border-slate-200 bg-slate-50">
              <div className="p-6">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-3">Footer: {footer?.name}</p>
                {renderStructure(footerStructure)}
              </div>
            </div>
          )}

          {/* Email Footer */}
          <div className="bg-slate-100 border-t border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-500">
              This is a preview of your email template
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
