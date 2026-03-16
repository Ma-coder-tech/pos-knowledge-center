export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(url: string) {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? escapeHtml(trimmed) : null;
}

function renderInlineMarkdown(markdown: string) {
  let value = escapeHtml(markdown);

  value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
    const safeUrl = sanitizeUrl(url);

    if (!safeUrl) {
      return escapeHtml(label);
    }

    return `<a href="${safeUrl}" target="_blank" rel="noreferrer">${label}</a>`;
  });
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  return value;
}

function renderImageLine(line: string) {
  const match = line.match(/^!\[(.*?)\]\((.*?)\)$/);

  if (!match) {
    return null;
  }

  const safeUrl = sanitizeUrl(match[2]);

  if (!safeUrl) {
    return null;
  }

  const alt = escapeHtml(match[1] || "Article image");

  return `
    <figure class="kb-media">
      <img class="kb-media-image" src="${safeUrl}" alt="${alt}" loading="lazy" />
      ${match[1] ? `<figcaption class="kb-media-caption">${alt}</figcaption>` : ""}
    </figure>
  `;
}

export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/!\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/`{1,3}[^`]+`{1,3}/g, "")
    .replace(/[#>*_\-]+/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderMarkdown(markdown: string) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const blocks = normalized.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return blocks
    .map((block) => {
      const imageBlock = renderImageLine(block);

      if (imageBlock) {
        return imageBlock;
      }

      if (block.startsWith("### ")) {
        return `<h3>${renderInlineMarkdown(block.slice(4))}</h3>`;
      }

      if (block.startsWith("## ")) {
        return `<h2>${renderInlineMarkdown(block.slice(3))}</h2>`;
      }

      if (block.startsWith("# ")) {
        return `<h1>${renderInlineMarkdown(block.slice(2))}</h1>`;
      }

      const lines = block.split("\n");
      if (lines.every((line) => line.startsWith("- "))) {
        return `<ul>${lines
          .map((line) => `<li>${renderInlineMarkdown(line.slice(2))}</li>`)
          .join("")}</ul>`;
      }

      return `<p>${lines
        .map((line) => {
          const imageLine = renderImageLine(line.trim());
          return imageLine || renderInlineMarkdown(line);
        })
        .join("<br />")}</p>`;
    })
    .join("");
}
