/**
 * Ad-hoc email utilities: branded HTML wrapper and AI email generation.
 */

const BRAND_PURPLE = "#7c3aed";
const BRAND_INDIGO = "#6366f1";

/**
 * Wraps body HTML in a SpiriVerse-branded email layout (table-based, inline CSS).
 */
export function buildAdHocEmailHtml(bodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>SpiriVerse</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="background:linear-gradient(135deg,${BRAND_PURPLE},${BRAND_INDIGO});border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
<tr>
<td style="background-color:rgba(255,255,255,0.2);border-radius:8px;width:36px;height:36px;text-align:center;vertical-align:middle;font-size:16px;font-weight:bold;color:#ffffff;">SV</td>
<td style="padding-left:12px;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">SpiriVerse</td>
</tr>
</table>
</td></tr>

<!-- Body -->
<tr><td style="background-color:#ffffff;padding:32px;font-size:15px;line-height:1.6;color:#374151;">
${bodyHtml}
</td></tr>

<!-- Footer -->
<tr><td style="background-color:#f9fafb;border-radius:0 0 12px 12px;padding:24px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
&copy; ${new Date().getFullYear()} SpiriVerse. All rights reserved.
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

const EMAIL_SYSTEM_PROMPT = `You are an email writer for SpiriVerse, an Australian spiritual wellness marketplace. Your job is to generate professional, visually appealing HTML emails.

## Rules
- Write warm but professional copy
- Generate rich inline-styled HTML safe for email clients (no external CSS, no <style> blocks)
- Create visually appealing elements:
  - CTA buttons: use table-based buttons with rounded corners, background ${BRAND_PURPLE} or ${BRAND_INDIGO}, white text, 14px+ padding
  - Info boxes: light purple/indigo background (#f5f3ff or #eef2ff), rounded corners, padding
  - Key-value cards: subtle borders, clean layout
  - Dividers: 1px solid #e5e7eb with margin
  - Bullet lists: use checkmark emoji (✓) or styled list items
- Use SpiriVerse brand colours: purple (${BRAND_PURPLE}), indigo (${BRAND_INDIGO}), warm grays
- Do NOT include a subject line in the HTML body
- Do NOT include header/footer — they are added separately
- On revision requests, return the full updated email (not a diff)

## Response Format
Always respond with valid JSON only — no markdown fences, no explanation outside the JSON:
{ "subject": "Email subject line", "bodyHtml": "<p>The HTML content...</p>" }`;

/**
 * Calls Anthropic to generate/refine an ad-hoc email based on conversation history.
 */
export async function generateEmailWithAi(
    messages: { role: string; content: string }[],
    apiKey: string
): Promise<{ subject: string; bodyHtml: string }> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 4096,
            system: EMAIL_SYSTEM_PROMPT,
            messages,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI request failed (${response.status}): ${error}`);
    }

    const data = await response.json();
    const text: string = data.content?.[0]?.text || "";

    // Parse JSON from response (handle possible markdown fences)
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    try {
        const parsed = JSON.parse(cleaned);
        return {
            subject: parsed.subject || "SpiriVerse Email",
            bodyHtml: parsed.bodyHtml || parsed.body_html || parsed.html || "<p>Email content</p>",
        };
    } catch {
        throw new Error("AI returned invalid JSON. Please try again.");
    }
}
