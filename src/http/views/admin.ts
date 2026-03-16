import { escapeHtml, renderMarkdown } from "./markdown";

type TenantView = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

type AdminDashboardData = {
  tenant: TenantView;
  articles: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    status: string;
    audience: string;
    updatedAt: Date | string;
    latestVersionId: string | null;
  }>;
  flows: Array<{
    id: string;
    title: string;
    symptom: string;
    status: string;
    audience: string;
    nodeCount: number;
    updatedAt: Date | string;
  }>;
  issues: Array<{
    id: string;
    title: string;
    symptom: string;
    status: string;
    audienceRecommendation: string;
    stepCount: number;
    updatedAt: Date | string;
  }>;
};

type ArticleEditorData = {
  tenant: TenantView;
  article?: {
    id: string;
    slug: string;
    currentStatus: string;
    audience: string;
    title: string;
    summary: string | null;
    body: string;
    versionNumber: number;
  };
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function badge(value: string) {
  return `<span class="admin-badge">${escapeHtml(value.replace(/_/g, " "))}</span>`;
}

function articleComposer(options: {
  tenant: TenantView;
  action: string;
  submitLabel: string;
  title: string;
  summary: string;
  body: string;
  audience: string;
  publishNowChecked?: boolean;
  heading: string;
  eyebrow: string;
  description: string;
  cancelHref?: string;
}) {
  return `
    <section class="admin-card">
      <p class="admin-eyebrow">${escapeHtml(options.eyebrow)}</p>
      <h2>${escapeHtml(options.heading)}</h2>
      <p class="admin-muted">${escapeHtml(options.description)}</p>
      <div class="admin-editor-grid" data-article-editor>
        <form class="admin-form" method="post" action="${options.action}">
          <label class="admin-label">Title
            <input class="admin-input" type="text" name="title" value="${escapeHtml(options.title)}" data-editor-title required />
          </label>
          <label class="admin-label">Summary
            <input class="admin-input" type="text" name="summary" value="${escapeHtml(options.summary)}" data-editor-summary />
          </label>
          <label class="admin-label">Audience
            <select class="admin-select" name="audience">
              <option value="merchant"${options.audience === "merchant" ? " selected" : ""}>Merchant</option>
              <option value="both"${options.audience === "both" ? " selected" : ""}>Both</option>
              <option value="internal"${options.audience === "internal" ? " selected" : ""}>Internal</option>
            </select>
          </label>
          <div class="admin-toolbar" aria-label="Formatting tools">
            <button class="admin-tool" type="button" data-editor-action="heading">H2</button>
            <button class="admin-tool" type="button" data-editor-action="bold">Bold</button>
            <button class="admin-tool" type="button" data-editor-action="list">List</button>
            <button class="admin-tool" type="button" data-editor-action="link">Link</button>
            <button class="admin-tool" type="button" data-editor-action="image">Image</button>
          </div>
          <label class="admin-label">Body
            <textarea class="admin-textarea admin-textarea--article" name="body" data-editor-body required>${escapeHtml(options.body)}</textarea>
          </label>
          <p class="admin-help">Use the toolbar or write Markdown directly. Remote images are supported with <code>![alt text](https://...)</code>.</p>
          <label class="admin-label admin-label--checkbox">
            <input type="checkbox" name="publishNow" value="yes"${options.publishNowChecked === false ? "" : " checked"} />
            Publish immediately
          </label>
          <div class="admin-inline-actions">
            <button class="admin-button admin-button--primary" type="submit">${escapeHtml(options.submitLabel)}</button>
            ${
              options.cancelHref
                ? `<a class="admin-button admin-button--ghost" href="${options.cancelHref}">Back</a>`
                : ""
            }
          </div>
        </form>
        <section class="admin-preview-card">
          <p class="admin-eyebrow">Live preview</p>
          <h3 data-editor-preview-title>${escapeHtml(options.title || "Your article title will appear here")}</h3>
          <p class="admin-muted" data-editor-preview-summary>${escapeHtml(options.summary || "A short summary helps merchants decide whether this guide is the right one.")}</p>
          <div class="admin-preview-body kb-prose" data-editor-preview-body>
            ${renderMarkdown(options.body || "Start writing to preview headings, bold text, bullets, links, and images.")}
          </div>
        </section>
      </div>
    </section>
  `;
}

function shell(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --bg: #f4ede3;
        --panel: rgba(255, 250, 243, 0.94);
        --panel-strong: #fffaf3;
        --ink: #1b1a17;
        --muted: #6d6358;
        --line: rgba(71, 49, 28, 0.14);
        --brand: #214f7a;
        --brand-strong: #173754;
        --accent: #d99b3f;
        --shadow: 0 24px 80px rgba(65, 41, 20, 0.12);
        --radius: 24px;
      }

      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(33, 79, 122, 0.14), transparent 24rem),
          radial-gradient(circle at bottom right, rgba(217, 155, 63, 0.14), transparent 20rem),
          linear-gradient(180deg, #f8f1e7 0%, #efe4d6 100%);
      }

      a { color: inherit; text-decoration: none; }
      code {
        font-family: "SFMono-Regular", "Menlo", monospace;
        background: rgba(27, 26, 23, 0.06);
        padding: 2px 6px;
        border-radius: 8px;
      }
      .admin-shell {
        width: min(1260px, calc(100vw - 32px));
        margin: 24px auto 56px;
      }
      .admin-header,
      .admin-card,
      .admin-preview-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: var(--shadow);
      }
      .admin-header {
        padding: 24px 28px;
        display: grid;
        gap: 18px;
      }
      .admin-top {
        display: flex;
        gap: 18px;
        justify-content: space-between;
        align-items: center;
      }
      .admin-mark {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        color: white;
        font-weight: 700;
        letter-spacing: 0.08em;
        background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
      }
      .admin-brand {
        display: flex;
        gap: 14px;
        align-items: center;
      }
      .admin-brand h1,
      .admin-card h2,
      .admin-card h3,
      .admin-preview-card h3 {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif;
      }
      .admin-subtitle,
      .admin-muted {
        margin: 0;
        color: var(--muted);
      }
      .admin-actions,
      .admin-pill-row,
      .admin-inline-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      .admin-button {
        border: 0;
        border-radius: 16px;
        padding: 12px 16px;
        font: inherit;
        cursor: pointer;
      }
      .admin-button--primary {
        background: linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%);
        color: white;
      }
      .admin-button--ghost {
        background: rgba(33, 79, 122, 0.08);
        color: var(--brand-strong);
      }
      .admin-main {
        margin-top: 22px;
        display: grid;
        gap: 18px;
      }
      .admin-grid {
        display: grid;
        gap: 18px;
      }
      .admin-grid--split {
        grid-template-columns: 1.05fr 0.95fr;
      }
      .admin-card,
      .admin-preview-card {
        padding: 22px;
      }
      .admin-card p,
      .admin-preview-card p { color: var(--muted); }
      .admin-eyebrow {
        margin: 0 0 8px;
        letter-spacing: 0.1em;
        font-size: 0.78rem;
        text-transform: uppercase;
        color: var(--brand);
      }
      .admin-form {
        display: grid;
        gap: 12px;
        margin-top: 14px;
      }
      .admin-label {
        display: grid;
        gap: 6px;
        font-size: 0.94rem;
        color: var(--ink);
      }
      .admin-label--checkbox {
        grid-auto-flow: column;
        justify-content: start;
        align-items: center;
        gap: 10px;
      }
      .admin-input,
      .admin-textarea,
      .admin-select {
        width: 100%;
        border: 1px solid rgba(60, 44, 28, 0.12);
        background: rgba(255, 255, 255, 0.9);
        border-radius: 16px;
        padding: 12px 14px;
        font: inherit;
      }
      .admin-textarea { min-height: 110px; resize: vertical; }
      .admin-textarea--article { min-height: 260px; }
      .admin-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .admin-tool {
        border: 1px solid rgba(33, 79, 122, 0.14);
        background: rgba(33, 79, 122, 0.06);
        color: var(--brand-strong);
        border-radius: 999px;
        padding: 8px 12px;
        font: inherit;
        cursor: pointer;
      }
      .admin-help {
        margin: -2px 0 0;
        font-size: 0.92rem;
        color: var(--muted);
      }
      .admin-list {
        display: grid;
        gap: 12px;
        margin-top: 14px;
      }
      .admin-list-item {
        padding: 16px 18px;
        border-radius: 20px;
        background: rgba(255,255,255,0.66);
        border: 1px solid rgba(60,44,28,0.08);
      }
      .admin-item-title {
        margin: 0;
        font-size: 1.05rem;
        color: var(--ink);
      }
      .admin-item-meta {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .admin-badge {
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(33, 79, 122, 0.09);
        color: var(--brand-strong);
        font-size: 0.8rem;
      }
      .admin-chooser {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      .admin-chooser-card {
        padding: 20px;
        border-radius: 24px;
        background: linear-gradient(160deg, rgba(255, 252, 247, 0.95), rgba(247, 236, 223, 0.9));
        border: 1px solid rgba(33, 79, 122, 0.12);
      }
      .admin-editor-grid {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 18px;
        margin-top: 14px;
      }
      .admin-preview-card {
        align-self: start;
        background: var(--panel-strong);
      }
      .admin-preview-body {
        margin-top: 16px;
        display: grid;
        gap: 14px;
      }
      .kb-prose h1,
      .kb-prose h2,
      .kb-prose h3 {
        margin: 16px 0 8px;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif;
        color: var(--ink);
      }
      .kb-prose p,
      .kb-prose li {
        color: var(--ink);
        line-height: 1.65;
      }
      .kb-prose a {
        color: var(--brand-strong);
      }
      .kb-prose ul {
        margin: 0;
        padding-left: 22px;
      }
      .kb-media {
        margin: 0;
        display: grid;
        gap: 8px;
      }
      .kb-media-image {
        width: 100%;
        border-radius: 18px;
        border: 1px solid rgba(60, 44, 28, 0.08);
        background: white;
      }
      .kb-media-caption {
        color: var(--muted);
        font-size: 0.92rem;
      }

      @media (max-width: 1080px) {
        .admin-editor-grid,
        .admin-grid--split { grid-template-columns: 1fr; }
      }

      @media (max-width: 960px) {
        .admin-top { flex-direction: column; align-items: stretch; }
      }
    </style>
  </head>
  <body>
    <div class="admin-shell">${body}</div>
    <script>
      function escapeHtmlClient(value) {
        return value
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function sanitizeUrlClient(url) {
        const trimmed = url.trim();
        return /^https?:\\/\\//i.test(trimmed) ? escapeHtmlClient(trimmed) : null;
      }

      function renderInlineClient(markdown) {
        let value = escapeHtmlClient(markdown);
        value = value.replace(/\x60([^\x60]+)\x60/g, "<code>$1</code>");
        value = value.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, function (_match, label, url) {
          const safeUrl = sanitizeUrlClient(url);
          if (!safeUrl) return escapeHtmlClient(label);
          return '<a href=\"' + safeUrl + '\" target=\"_blank\" rel=\"noreferrer\">' + label + '</a>';
        });
        value = value.replace(/\\*\\*([^*]+)\\*\\*/g, "<strong>$1</strong>");
        value = value.replace(/\\*([^*]+)\\*/g, "<em>$1</em>");
        return value;
      }

      function renderImageLineClient(line) {
        const match = line.match(/^!\\[(.*?)\\]\\((.*?)\\)$/);
        if (!match) return null;
        const safeUrl = sanitizeUrlClient(match[2]);
        if (!safeUrl) return null;
        const alt = escapeHtmlClient(match[1] || "Article image");
        return '<figure class=\"kb-media\"><img class=\"kb-media-image\" src=\"' + safeUrl + '\" alt=\"' + alt + '\" loading=\"lazy\" />' +
          (match[1] ? '<figcaption class=\"kb-media-caption\">' + alt + '</figcaption>' : '') +
          '</figure>';
      }

      function renderMarkdownClient(markdown) {
        const normalized = markdown.replace(/\\r\\n/g, "\\n");
        const blocks = normalized.split(/\\n{2,}/).map((block) => block.trim()).filter(Boolean);
        if (blocks.length === 0) {
          return "<p>Start writing to preview headings, bold text, bullets, links, and images.</p>";
        }

        return blocks.map((block) => {
          const imageBlock = renderImageLineClient(block);
          if (imageBlock) return imageBlock;
          if (block.startsWith("### ")) return "<h3>" + renderInlineClient(block.slice(4)) + "</h3>";
          if (block.startsWith("## ")) return "<h2>" + renderInlineClient(block.slice(3)) + "</h2>";
          if (block.startsWith("# ")) return "<h1>" + renderInlineClient(block.slice(2)) + "</h1>";
          const lines = block.split("\\n");
          if (lines.every((line) => line.startsWith("- "))) {
            return "<ul>" + lines.map((line) => "<li>" + renderInlineClient(line.slice(2)) + "</li>").join("") + "</ul>";
          }
          return "<p>" + lines.map((line) => renderImageLineClient(line.trim()) || renderInlineClient(line)).join("<br />") + "</p>";
        }).join("");
      }

      function replaceSelection(textarea, prefix, suffix, fallback) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.slice(start, end) || fallback;
        const next = prefix + selected + suffix;
        textarea.setRangeText(next, start, end, "end");
        textarea.focus();
      }

      function prependLines(textarea, prefix) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.slice(start, end) || "List item";
        const updated = selected
          .split("\\n")
          .map((line) => (line.trim() ? prefix + line : line))
          .join("\\n");
        textarea.setRangeText(updated, start, end, "end");
        textarea.focus();
      }

      function updateEditorPreview(root) {
        const title = root.querySelector("[data-editor-title]");
        const summary = root.querySelector("[data-editor-summary]");
        const body = root.querySelector("[data-editor-body]");
        const previewTitle = root.querySelector("[data-editor-preview-title]");
        const previewSummary = root.querySelector("[data-editor-preview-summary]");
        const previewBody = root.querySelector("[data-editor-preview-body]");
        if (!title || !summary || !body || !previewTitle || !previewSummary || !previewBody) return;
        previewTitle.textContent = title.value.trim() || "Your article title will appear here";
        previewSummary.textContent = summary.value.trim() || "A short summary helps merchants decide whether this guide is the right one.";
        previewBody.innerHTML = renderMarkdownClient(body.value);
      }

      document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-editor-action]");
        if (!button) return;
        const root = button.closest("[data-article-editor]");
        const textarea = root && root.querySelector("[data-editor-body]");
        if (!textarea) return;
        const action = button.getAttribute("data-editor-action");

        if (action === "heading") replaceSelection(textarea, "## ", "", "Section heading");
        if (action === "bold") replaceSelection(textarea, "**", "**", "important text");
        if (action === "list") prependLines(textarea, "- ");
        if (action === "link") {
          const url = window.prompt("Paste the link URL");
          if (!url) return;
          replaceSelection(textarea, "[", "](" + url + ")", "link text");
        }
        if (action === "image") {
          const url = window.prompt("Paste the image URL");
          if (!url) return;
          const alt = window.prompt("Describe the image", "Product screenshot") || "Product screenshot";
          const snippet = "\\n\\n![" + alt + "](" + url + ")\\n\\n";
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.setRangeText(snippet, start, end, "end");
          textarea.focus();
        }

        updateEditorPreview(root);
      });

      document.addEventListener("input", (event) => {
        const root = event.target.closest("[data-article-editor]");
        if (root) updateEditorPreview(root);
      });

      document.querySelectorAll("[data-article-editor]").forEach(updateEditorPreview);
    </script>
  </body>
</html>`;
}

export function renderAdminChooser(tenants: TenantView[]) {
  const cards = tenants
    .map(
      (tenant) => `
        <a class="admin-chooser-card" href="/admin/${tenant.slug}">
          <p class="admin-eyebrow">Company workspace</p>
          <h3>${escapeHtml(tenant.name)}</h3>
          <p class="admin-muted">${escapeHtml(tenant.slug)}</p>
          <div class="admin-pill-row">
            ${badge(tenant.timezone)}
          </div>
        </a>
      `,
    )
    .join("");

  return shell(
    "Choose a team workspace",
    `
      <section class="admin-header">
        <div class="admin-top">
          <div class="admin-brand">
            <div class="admin-mark">ADM</div>
            <div>
              <h1>Knowledge Center Team Workspace</h1>
              <p class="admin-subtitle">Create and publish content that merchants will see in the self-service portal.</p>
            </div>
          </div>
        </div>
      </section>
      <main class="admin-main">
        <section class="admin-card">
          <p class="admin-eyebrow">Choose a company</p>
          <h2>Open a team workspace</h2>
          <div class="admin-chooser">${cards}</div>
        </section>
      </main>
    `,
  );
}

export function renderAdminArticleEditor({ tenant, article }: ArticleEditorData) {
  const isEditing = Boolean(article);

  return shell(
    isEditing ? `Edit ${article?.title}` : `Create article for ${tenant.name}`,
    `
      <section class="admin-header">
        <div class="admin-top">
          <div class="admin-brand">
            <div class="admin-mark">ADM</div>
            <div>
              <h1>${isEditing ? `Edit article for ${escapeHtml(tenant.name)}` : `Create article for ${escapeHtml(tenant.name)}`}</h1>
              <p class="admin-subtitle">Write rich merchant-facing content with formatting, links, screenshots, and a live preview.</p>
            </div>
          </div>
          <div class="admin-actions">
            <a class="admin-button admin-button--ghost" href="/admin/${tenant.slug}">Back to team workspace</a>
            <a class="admin-button admin-button--ghost" href="/kb/${tenant.slug}">Open merchant portal</a>
          </div>
        </div>
        ${
          article
            ? `<div class="admin-pill-row">
                 ${badge(article.currentStatus)}
                 ${badge(article.audience)}
                 <span class="admin-muted">Editing version ${article.versionNumber}</span>
               </div>`
            : ""
        }
      </section>
      <main class="admin-main">
        ${articleComposer({
          tenant,
          action: isEditing ? `/admin/${tenant.slug}/articles/${article?.id}` : `/admin/${tenant.slug}/articles`,
          submitLabel: isEditing ? "Save article changes" : "Create article",
          title: article?.title ?? "",
          summary: article?.summary ?? "",
          body: article?.body ?? "",
          audience: article?.audience ?? "merchant",
          publishNowChecked: true,
          heading: isEditing ? "Edit article" : "Create article",
          eyebrow: isEditing ? "Article editor" : "Create article",
          description: isEditing
            ? "Save a new version of this article. Publish it now if you want merchants to see the update immediately."
            : "Draft a merchant-facing guide with headings, bold text, links, and screenshots.",
          cancelHref: `/admin/${tenant.slug}`,
        })}
      </main>
    `,
  );
}

export function renderAdminDashboard({ tenant, articles, flows, issues }: AdminDashboardData) {
  const articleList = articles.length
    ? articles
        .map(
          (article) => `
            <div class="admin-list-item">
              <p class="admin-item-title">${escapeHtml(article.title)}</p>
              <p class="admin-muted">${escapeHtml(article.summary ?? "No summary yet.")}</p>
              <div class="admin-item-meta">
                ${badge(article.status)}
                ${badge(article.audience)}
                <span class="admin-muted">Updated ${formatDate(article.updatedAt)}</span>
              </div>
              <div class="admin-inline-actions" style="margin-top: 12px;">
                <a class="admin-button admin-button--ghost" href="/admin/${tenant.slug}/articles/${article.id}/edit">Edit article</a>
                ${
                  article.status === "published"
                    ? `<a class="admin-button admin-button--ghost" href="/kb/${tenant.slug}/articles/${article.slug}">Open in merchant portal</a>`
                    : `<span class="admin-muted">Publish to make this visible in the merchant portal.</span>`
                }
                ${
                  article.status !== "published"
                    ? `
                      <form method="post" action="/admin/${tenant.slug}/articles/${article.id}/publish">
                        <button class="admin-button admin-button--primary" type="submit">Publish latest</button>
                      </form>
                    `
                    : ""
                }
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="admin-list-item"><p class="admin-muted">No articles yet.</p></div>`;

  const flowList = flows.length
    ? flows
        .map(
          (flow) => `
            <div class="admin-list-item">
              <p class="admin-item-title">${escapeHtml(flow.title)}</p>
              <p class="admin-muted">${escapeHtml(flow.symptom)}</p>
              <div class="admin-item-meta">
                ${badge(flow.status)}
                ${badge(flow.audience)}
                <span class="admin-muted">${flow.nodeCount} nodes</span>
                <span class="admin-muted">Updated ${formatDate(flow.updatedAt)}</span>
              </div>
              <div class="admin-inline-actions" style="margin-top: 12px;">
                ${
                  flow.status === "published"
                    ? `<a class="admin-button admin-button--ghost" href="/kb/${tenant.slug}/flows/${flow.id}">Open in merchant portal</a>`
                    : `<span class="admin-muted">Publish to make this visible in the merchant portal.</span>`
                }
                ${
                  flow.status !== "published"
                    ? `
                      <form method="post" action="/admin/${tenant.slug}/flows/${flow.id}/publish">
                        <button class="admin-button admin-button--primary" type="submit">Publish flow</button>
                      </form>
                    `
                    : ""
                }
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="admin-list-item"><p class="admin-muted">No troubleshooting flows yet.</p></div>`;

  const issueList = issues.length
    ? issues
        .map(
          (issue) => `
            <div class="admin-list-item">
              <p class="admin-item-title">${escapeHtml(issue.title)}</p>
              <p class="admin-muted">${escapeHtml(issue.symptom)}</p>
              <div class="admin-item-meta">
                ${badge(issue.status)}
                ${badge(issue.audienceRecommendation)}
                <span class="admin-muted">${issue.stepCount} steps</span>
                <span class="admin-muted">Updated ${formatDate(issue.updatedAt)}</span>
              </div>
              <div class="admin-inline-actions" style="margin-top: 12px;">
                ${
                  issue.status === "published"
                    ? `<a class="admin-button admin-button--ghost" href="/kb/${tenant.slug}/issues/${issue.id}">Open in merchant portal</a>`
                    : `<span class="admin-muted">Publish to make this visible in the merchant portal.</span>`
                }
                ${
                  issue.status !== "published"
                    ? `
                      <form method="post" action="/admin/${tenant.slug}/issues/${issue.id}/publish">
                        <button class="admin-button admin-button--primary" type="submit">Publish issue</button>
                      </form>
                    `
                    : ""
                }
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="admin-list-item"><p class="admin-muted">No solved issues yet.</p></div>`;

  return shell(
    `Team workspace for ${tenant.name}`,
    `
      <section class="admin-header">
        <div class="admin-top">
          <div class="admin-brand">
            <div class="admin-mark">ADM</div>
            <div>
              <h1>Team workspace for ${escapeHtml(tenant.name)}</h1>
              <p class="admin-subtitle">Create merchant-facing knowledge and publish it into the self-service portal.</p>
            </div>
          </div>
          <div class="admin-actions">
            <a class="admin-button admin-button--ghost" href="/kb/${tenant.slug}">Open merchant portal</a>
            <a class="admin-button admin-button--ghost" href="/admin">Switch company</a>
          </div>
        </div>
        <div class="admin-pill-row">
          ${badge(tenant.timezone)}
          ${badge(`${articles.length} articles`)}
          ${badge(`${flows.length} flows`)}
          ${badge(`${issues.length} solved issues`)}
        </div>
      </section>

      <main class="admin-main">
        <div class="admin-grid admin-grid--split">
          ${articleComposer({
            tenant,
            action: `/admin/${tenant.slug}/articles`,
            submitLabel: "Create article",
            title: "",
            summary: "",
            body: "",
            audience: "merchant",
            publishNowChecked: true,
            heading: "Add a merchant-facing guide",
            eyebrow: "Create article",
            description: "Write the article with real formatting support. Bold text, headings, links, and screenshots all preview before you publish.",
          })}

          <section class="admin-card">
            <p class="admin-eyebrow">Existing articles</p>
            <h2>What merchants can read</h2>
            <div class="admin-list">${articleList}</div>
          </section>
        </div>

        <div class="admin-grid admin-grid--split">
          <section class="admin-card">
            <p class="admin-eyebrow">Create troubleshooting flow</p>
            <h2>Build a simple guided flow</h2>
            <form class="admin-form" method="post" action="/admin/${tenant.slug}/flows">
              <label class="admin-label">Flow title
                <input class="admin-input" type="text" name="title" required />
              </label>
              <label class="admin-label">Symptom
                <textarea class="admin-textarea" name="symptom" required></textarea>
              </label>
              <label class="admin-label">Audience
                <select class="admin-select" name="audience">
                  <option value="merchant">Merchant</option>
                  <option value="both">Both</option>
                  <option value="internal">Internal</option>
                </select>
              </label>
              <label class="admin-label">First step
                <textarea class="admin-textarea" name="startBody" required></textarea>
              </label>
              <label class="admin-label">Question title
                <input class="admin-input" type="text" name="questionTitle" value="Did that fix the problem?" required />
              </label>
              <label class="admin-label">Question help text
                <textarea class="admin-textarea" name="questionBody" required></textarea>
              </label>
              <label class="admin-label">Yes outcome
                <textarea class="admin-textarea" name="yesOutcomeBody" required></textarea>
              </label>
              <label class="admin-label">No outcome
                <textarea class="admin-textarea" name="noOutcomeBody" required></textarea>
              </label>
              <label class="admin-label admin-label--checkbox">
                <input type="checkbox" name="publishNow" value="yes" checked />
                Publish immediately
              </label>
              <button class="admin-button admin-button--primary" type="submit">Create flow</button>
            </form>
          </section>

          <section class="admin-card">
            <p class="admin-eyebrow">Existing flows</p>
            <h2>What merchants can troubleshoot</h2>
            <div class="admin-list">${flowList}</div>
          </section>
        </div>

        <div class="admin-grid admin-grid--split">
          <section class="admin-card">
            <p class="admin-eyebrow">Create solved issue</p>
            <h2>Capture a reusable support resolution</h2>
            <form class="admin-form" method="post" action="/admin/${tenant.slug}/issues">
              <label class="admin-label">Issue title
                <input class="admin-input" type="text" name="title" required />
              </label>
              <label class="admin-label">Symptom
                <textarea class="admin-textarea" name="symptom" required></textarea>
              </label>
              <label class="admin-label">Root cause
                <textarea class="admin-textarea" name="rootCause"></textarea>
              </label>
              <label class="admin-label">Resolution steps (one step per line)
                <textarea class="admin-textarea" name="resolutionSteps" required></textarea>
              </label>
              <label class="admin-label">Audience
                <select class="admin-select" name="audienceRecommendation">
                  <option value="merchant">Merchant</option>
                  <option value="both">Both</option>
                  <option value="internal">Internal</option>
                </select>
              </label>
              <label class="admin-label admin-label--checkbox">
                <input type="checkbox" name="publishNow" value="yes" checked />
                Publish immediately
              </label>
              <button class="admin-button admin-button--primary" type="submit">Create solved issue</button>
            </form>
          </section>

          <section class="admin-card">
            <p class="admin-eyebrow">Existing solved issues</p>
            <h2>What merchants can reuse</h2>
            <div class="admin-list">${issueList}</div>
          </section>
        </div>
      </main>
    `,
  );
}
