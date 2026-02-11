// Simple markdown to HTML converter for preview
// Handles headings, bold, italic, links, lists, tables, horizontal rules, code blocks
export function markdownToHtml(md: string): string {
  let html = md
    // Escape HTML first
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks (fenced)
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>'
    )
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Headings
    .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links (internal /legal/ links stay in-page, external open in new tab)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_match, text, href) =>
        href.startsWith('/legal/')
          ? `<a href="${href}">${text}</a>`
          : `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
    )
    // Horizontal rules
    .replace(/^---$/gm, "<hr>")
    // Unordered lists
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // Paragraphs (lines not starting with tags)
    .replace(
      /^(?!<[hluoprtd]|<li|<hr|<pre|<code)(.+)$/gm,
      "<p>$1</p>"
    );

  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li>[\s\S]*?<\/li>)(?:\s*(<li>[\s\S]*?<\/li>))*/g,
    (match) => `<ul>${match}</ul>`
  );

  // Simple table support
  html = html.replace(
    /(<p>\|[\s\S]*?\|<\/p>\s*)+/g,
    (block) => {
      const rows = block
        .replace(/<\/?p>/g, "")
        .trim()
        .split("\n")
        .filter((r) => r.trim());

      if (rows.length < 2) return block;

      // Check if second row is a separator
      const isSeparator = /^\|[\s-:|]+\|$/.test(rows[1].trim());
      if (!isSeparator) return block;

      const headerCells = rows[0]
        .split("|")
        .filter((c) => c.trim())
        .map((c) => `<th>${c.trim()}</th>`)
        .join("");

      const bodyRows = rows
        .slice(2)
        .map((row) => {
          const cells = row
            .split("|")
            .filter((c) => c.trim())
            .map((c) => `<td>${c.trim()}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");

      return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    }
  );

  return html;
}
