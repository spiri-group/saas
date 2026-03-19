/**
 * Server-side renderer for EmailStructure JSON → inline-styled HTML.
 * Produces email-client-safe HTML (table-based, all inline CSS).
 */

interface ContentBlock {
    id: string;
    blockType: string;
    // Text
    title?: string;
    titleAlign?: string;
    titleSize?: string;
    subtitle?: string;
    subtitleAlign?: string;
    subtitleSize?: string;
    description?: string;
    descriptionAlign?: string;
    isQuote?: boolean;
    textBgColor?: string;
    textBorderColor?: string;
    textBorderRadius?: number;
    textPadding?: number;
    textFontFamily?: string;
    textFontSize?: number;
    // Image
    imageUrl?: string;
    imageAlt?: string;
    imageLink?: string;
    // Button
    buttonText?: string;
    buttonUrl?: string;
    buttonStyle?: string;
    buttonAlign?: string;
    // Hero
    heroBgColor?: string;
    heroBgImage?: string;
    heroTitle?: string;
    heroSubtitle?: string;
    heroTextColor?: string;
    heroMinHeight?: number;
    heroTextAlign?: string;
    heroButtonText?: string;
    heroButtonUrl?: string;
    heroButtonStyle?: string;
    // Info Card
    infoCardItems?: { id: string; label: string; value: string }[];
    infoCardStyle?: string;
    infoCardBgColor?: string;
    infoCardBorderColor?: string;
    // Divider
    dividerBlockStyle?: string;
    dividerBlockColor?: string;
    dividerBlockHeight?: number;
    dividerBlockWidth?: number;
    // Spacer
    spacerHeight?: number;
    // Social
    socialFacebookUrl?: string;
    socialXUrl?: string;
    socialInstagramUrl?: string;
    socialLinkedinUrl?: string;
    socialYoutubeUrl?: string;
    socialTiktokUrl?: string;
    socialIconSize?: number;
    socialAlign?: string;
}

interface EmailLayout {
    type: string;
    slots: Record<string, string>;
    slotWidths?: Record<string, number>;
    padding?: { top?: number; bottom?: number; left?: number; right?: number };
}

interface EmailStructure {
    contentBlocks: ContentBlock[];
    layout?: EmailLayout;
}

const TITLE_SIZES: Record<string, string> = {
    small: "18px",
    medium: "20px",
    large: "24px",
    xlarge: "30px",
};

const SUBTITLE_SIZES: Record<string, string> = {
    small: "13px",
    medium: "15px",
    large: "18px",
};

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function renderBlock(block: ContentBlock): string {
    switch (block.blockType) {
        case "spacer":
            return `<div style="height:${block.spacerHeight || 20}px;"></div>`;

        case "dividerBlock": {
            const color = block.dividerBlockColor || "#e2e8f0";
            const height = block.dividerBlockHeight || 1;
            const width = block.dividerBlockWidth || 100;
            const style = block.dividerBlockStyle || "solid";
            const border = style !== "gradient"
                ? `border-top:${height}px ${style} ${color};`
                : `background:linear-gradient(to right,transparent,${color},transparent);height:${height}px;`;
            return `<div style="text-align:center;padding:8px 0;"><div style="width:${width}%;margin:0 auto;${border}"></div></div>`;
        }

        case "hero": {
            const bgColor = block.heroBgColor || "#6b21a8";
            const textColor = block.heroTextColor || "#ffffff";
            const align = block.heroTextAlign || "center";
            const minH = block.heroMinHeight || 200;
            let html = `<div style="background-color:${bgColor};${block.heroBgImage ? `background-image:url(${block.heroBgImage});background-size:cover;background-position:center;` : ""}min-height:${minH}px;color:${textColor};text-align:${align};padding:24px;border-radius:8px;">`;
            if (block.heroTitle) {
                html += `<h2 style="margin:0 0 8px;font-size:24px;font-weight:bold;color:${textColor};">${escapeHtml(block.heroTitle)}</h2>`;
            }
            if (block.heroSubtitle) {
                html += `<p style="margin:0;font-size:16px;opacity:0.9;color:${textColor};">${escapeHtml(block.heroSubtitle)}</p>`;
            }
            if (block.heroButtonText && block.heroButtonUrl) {
                const btnStyle = block.heroButtonStyle === "secondary"
                    ? `background-color:rgba(255,255,255,0.2);color:${textColor};border:1px solid rgba(255,255,255,0.3);`
                    : block.heroButtonStyle === "outline"
                    ? `background-color:transparent;color:${textColor};border:2px solid ${textColor};`
                    : `background-color:#ffffff;color:${bgColor};`;
                html += `<div style="margin-top:16px;"><a href="${escapeHtml(block.heroButtonUrl)}" style="display:inline-block;padding:10px 24px;border-radius:6px;font-weight:600;text-decoration:none;font-size:14px;${btnStyle}">${escapeHtml(block.heroButtonText)}</a></div>`;
            }
            html += `</div>`;
            return html;
        }

        case "infoCard": {
            const style = block.infoCardStyle || "default";
            const bgColor = block.infoCardBgColor || (style === "filled" ? "#f3e8ff" : "#f8fafc");
            const borderColor = block.infoCardBorderColor || "#e2e8f0";
            let border = "";
            if (style === "outlined" || style === "default") border = `border:1px solid ${borderColor};`;
            else if (style === "accent") border = `border-left:4px solid ${borderColor};`;
            let html = `<div style="background-color:${bgColor};${border}border-radius:8px;padding:16px;">`;
            if (block.infoCardItems && block.infoCardItems.length > 0) {
                for (const item of block.infoCardItems) {
                    html += `<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px;"><span style="color:#64748b;font-weight:500;">${escapeHtml(item.label)}</span><span style="color:#0f172a;font-weight:600;">${escapeHtml(item.value)}</span></div>`;
                }
            }
            html += `</div>`;
            return html;
        }

        case "button": {
            const align = block.buttonAlign || "full";
            const textAlign = align === "full" ? "center" : align;
            const display = align === "full" ? "display:block;width:100%;" : "display:inline-block;";
            const btnStyle = block.buttonStyle === "secondary"
                ? "background-color:#e2e8f0;color:#0f172a;"
                : block.buttonStyle === "outline"
                ? "border:2px solid #0f172a;color:#0f172a;background-color:transparent;"
                : "background-color:#7c3aed;color:#ffffff;";
            if (!block.buttonText || !block.buttonUrl) return "";
            return `<div style="text-align:${textAlign};margin-top:16px;"><a href="${escapeHtml(block.buttonUrl)}" style="${display}text-align:center;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;${btnStyle}">${escapeHtml(block.buttonText)}</a></div>`;
        }

        case "social": {
            const align = block.socialAlign || "center";
            const size = block.socialIconSize || 32;
            const links: string[] = [];
            // Use simple text labels since we can't render SVG icons server-side
            if (block.socialFacebookUrl) links.push(`<a href="${escapeHtml(block.socialFacebookUrl)}" style="color:#64748b;text-decoration:none;font-size:${size > 24 ? 14 : 12}px;margin:0 8px;">Facebook</a>`);
            if (block.socialXUrl) links.push(`<a href="${escapeHtml(block.socialXUrl)}" style="color:#64748b;text-decoration:none;font-size:${size > 24 ? 14 : 12}px;margin:0 8px;">X</a>`);
            if (block.socialInstagramUrl) links.push(`<a href="${escapeHtml(block.socialInstagramUrl)}" style="color:#64748b;text-decoration:none;font-size:${size > 24 ? 14 : 12}px;margin:0 8px;">Instagram</a>`);
            if (block.socialLinkedinUrl) links.push(`<a href="${escapeHtml(block.socialLinkedinUrl)}" style="color:#64748b;text-decoration:none;font-size:${size > 24 ? 14 : 12}px;margin:0 8px;">LinkedIn</a>`);
            if (block.socialYoutubeUrl) links.push(`<a href="${escapeHtml(block.socialYoutubeUrl)}" style="color:#64748b;text-decoration:none;font-size:${size > 24 ? 14 : 12}px;margin:0 8px;">YouTube</a>`);
            if (block.socialTiktokUrl) links.push(`<a href="${escapeHtml(block.socialTiktokUrl)}" style="color:#64748b;text-decoration:none;font-size:${size > 24 ? 14 : 12}px;margin:0 8px;">TikTok</a>`);
            if (links.length === 0) return "";
            return `<div style="text-align:${align};padding:8px 0;">${links.join("")}</div>`;
        }

        case "image": {
            if (!block.imageUrl) return "";
            const img = `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.imageAlt || "")}" style="width:100%;height:auto;display:block;border-radius:8px;" />`;
            if (block.imageLink) {
                return `<a href="${escapeHtml(block.imageLink)}" target="_blank" rel="noopener noreferrer">${img}</a>`;
            }
            return img;
        }

        case "text":
        default: {
            let html = "";
            const wrapperStyles: string[] = [];
            if (block.textBgColor) wrapperStyles.push(`background-color:${block.textBgColor};`);
            if (block.textBorderColor) wrapperStyles.push(`border:1px solid ${block.textBorderColor};`);
            if (block.textBorderRadius) wrapperStyles.push(`border-radius:${block.textBorderRadius}px;`);
            if (block.textPadding) wrapperStyles.push(`padding:${block.textPadding}px;`);
            if (block.textFontFamily && block.textFontFamily !== "default") wrapperStyles.push(`font-family:${block.textFontFamily};`);
            if (block.textFontSize) wrapperStyles.push(`font-size:${block.textFontSize}px;`);

            const openWrapper = wrapperStyles.length > 0 ? `<div style="${wrapperStyles.join("")}">` : "";
            const closeWrapper = wrapperStyles.length > 0 ? `</div>` : "";

            html += openWrapper;

            if (block.isQuote) html += `<div style="border-left:4px solid #7c3aed;padding-left:16px;font-style:italic;">`;

            if (block.imageUrl) {
                const img = `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.imageAlt || "")}" style="width:100%;height:auto;display:block;border-radius:8px;margin-bottom:12px;" />`;
                html += block.imageLink
                    ? `<a href="${escapeHtml(block.imageLink)}" target="_blank" rel="noopener noreferrer">${img}</a>`
                    : img;
            }

            if (block.title) {
                const size = TITLE_SIZES[block.titleSize || "large"] || "24px";
                const align = block.titleAlign || "left";
                html += `<h2 style="margin:0 0 8px;font-size:${size};font-weight:bold;color:#0f172a;text-align:${align};">${escapeHtml(block.title)}</h2>`;
            }

            if (block.subtitle) {
                const size = SUBTITLE_SIZES[block.subtitleSize || "medium"] || "15px";
                const align = block.subtitleAlign || "left";
                html += `<h3 style="margin:0 0 8px;font-size:${size};font-weight:600;color:#334155;text-align:${align};">${escapeHtml(block.subtitle)}</h3>`;
            }

            if (block.description) {
                const align = block.descriptionAlign || "justify";
                // Description may contain rich text HTML from the editor
                html += `<div style="color:#475569;line-height:1.6;text-align:${align};">${block.description}</div>`;
            }

            if (block.buttonText && block.buttonUrl) {
                const btnAlign = block.buttonAlign || "full";
                const textAlign = btnAlign === "full" ? "center" : btnAlign;
                const display = btnAlign === "full" ? "display:block;width:100%;" : "display:inline-block;";
                const btnStyle = block.buttonStyle === "secondary"
                    ? "background-color:#e2e8f0;color:#0f172a;"
                    : block.buttonStyle === "outline"
                    ? "border:2px solid #0f172a;color:#0f172a;background-color:transparent;"
                    : "background-color:#7c3aed;color:#ffffff;";
                html += `<div style="text-align:${textAlign};margin-top:16px;"><a href="${escapeHtml(block.buttonUrl)}" style="${display}text-align:center;padding:12px 24px;border-radius:8px;font-weight:600;text-decoration:none;font-size:14px;${btnStyle}">${escapeHtml(block.buttonText)}</a></div>`;
            }

            if (block.isQuote) html += `</div>`;
            html += closeWrapper;
            return html;
        }
    }
}

/**
 * Renders an EmailStructure JSON into inline-styled HTML suitable for email clients.
 * Returns just the content HTML (no DOCTYPE wrapper).
 */
export function renderStructureToHtml(structureJson: string): string {
    let structure: EmailStructure;
    try {
        // Strip the "<!-- Email Structure -->" comment prefix if present
        const cleaned = structureJson.replace(/^<!--[^>]*-->\s*/, "").trim();
        structure = JSON.parse(cleaned);
    } catch {
        return "";
    }

    if (!structure.contentBlocks || structure.contentBlocks.length === 0) {
        return "";
    }

    const blocks = structure.contentBlocks;
    const layout = structure.layout;

    // No layout — render blocks sequentially
    if (!layout) {
        return blocks.map((b) => `<div style="margin-bottom:16px;">${renderBlock(b)}</div>`).join("");
    }

    const slots = layout.slots || {};
    const padding = layout.padding || {};
    const pt = padding.top ?? 20;
    const pb = padding.bottom ?? 20;
    const pl = padding.left ?? 20;
    const pr = padding.right ?? 20;

    // Simple: render blocks in slot order
    const slotIds = Object.keys(slots);
    const renderedBlocks = slotIds
        .map((slotId) => {
            const blockId = slots[slotId];
            const block = blocks.find((b) => b.id === blockId);
            return block ? renderBlock(block) : "";
        })
        .filter(Boolean);

    return `<div style="padding:${pt}px ${pr}px ${pb}px ${pl}px;">${renderedBlocks.map((h) => `<div style="margin-bottom:16px;">${h}</div>`).join("")}</div>`;
}
