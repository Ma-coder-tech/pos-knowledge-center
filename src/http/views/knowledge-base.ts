import { escapeHtml, renderMarkdown, stripMarkdown } from "./markdown";

type TenantView = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

type ShellOptions = {
  title: string;
  subtitle?: string;
  tenant?: TenantView;
  currentPath?: string;
  searchValue?: string;
  body: string;
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

function navLink(label: string, href: string, currentPath?: string) {
  const active = currentPath === href || currentPath?.startsWith(`${href}/`);
  return `<a class="kb-nav-link${active ? " is-active" : ""}" href="${href}">${escapeHtml(label)}</a>`;
}

function searchForm(action: string, searchValue?: string, compact = false) {
  return `
    <form class="kb-search${compact ? " is-compact" : ""}" method="get" action="${action}">
      <label class="kb-search-label" for="kb-search-input">Search the knowledge center</label>
      <div class="kb-search-row">
        <input id="kb-search-input" class="kb-search-input" type="search" name="q" value="${escapeHtml(searchValue ?? "")}" placeholder="Search articles, troubleshooting, or solved issues" />
        <button class="kb-button kb-button--primary" type="submit">Search</button>
      </div>
    </form>
  `;
}

function statusBadge(value: string) {
  return `<span class="kb-badge">${escapeHtml(value.replace(/_/g, " "))}</span>`;
}

function shell({ title, subtitle, tenant, currentPath, searchValue, body }: ShellOptions) {
  const tenantPrefix = tenant ? `/kb/${tenant.slug}` : "/kb";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --bg: #f4ede3;
        --panel: rgba(255, 250, 243, 0.88);
        --panel-strong: #fff9f1;
        --ink: #1b1a17;
        --muted: #6d6358;
        --line: rgba(71, 49, 28, 0.14);
        --brand: #9f4421;
        --brand-strong: #7f2c14;
        --accent: #d9a441;
        --ok: #1f6f5d;
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
          radial-gradient(circle at top left, rgba(217, 164, 65, 0.18), transparent 24rem),
          radial-gradient(circle at bottom right, rgba(159, 68, 33, 0.14), transparent 20rem),
          linear-gradient(180deg, #f8f1e7 0%, #efe4d6 100%);
      }

      a { color: inherit; text-decoration: none; }
      .kb-shell {
        width: min(1180px, calc(100vw - 32px));
        margin: 24px auto 56px;
      }
      .kb-header {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: var(--shadow);
        overflow: hidden;
      }
      .kb-header-top {
        display: flex;
        gap: 20px;
        align-items: center;
        justify-content: space-between;
        padding: 22px 28px 12px;
      }
      .kb-brand {
        display: flex;
        gap: 14px;
        align-items: center;
      }
      .kb-mark {
        width: 46px;
        height: 46px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, var(--brand) 0%, var(--accent) 100%);
        color: white;
        font-family: "Avenir Next Condensed", "Arial Narrow", sans-serif;
        font-size: 1.1rem;
        letter-spacing: 0.16em;
      }
      .kb-brand-title {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif;
        font-size: 1.45rem;
      }
      .kb-brand-subtitle {
        margin: 2px 0 0;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .kb-tenant-pill {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        border: 1px solid rgba(159, 68, 33, 0.16);
        background: rgba(255, 248, 240, 0.96);
        padding: 10px 14px;
        border-radius: 999px;
        font-size: 0.92rem;
        color: var(--muted);
      }
      .kb-hero {
        padding: 18px 28px 28px;
        display: grid;
        gap: 20px;
      }
      .kb-title {
        margin: 0;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif;
        font-size: clamp(2rem, 3vw, 3.4rem);
        line-height: 1;
      }
      .kb-subtitle {
        margin: 0;
        color: var(--muted);
        max-width: 62ch;
        font-size: 1.02rem;
      }
      .kb-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 0 28px 24px;
      }
      .kb-nav-link {
        padding: 10px 14px;
        border-radius: 999px;
        color: var(--muted);
      }
      .kb-nav-link.is-active,
      .kb-nav-link:hover {
        background: rgba(159, 68, 33, 0.09);
        color: var(--brand-strong);
      }
      .kb-search { display: grid; gap: 8px; }
      .kb-search-label {
        font-size: 0.9rem;
        color: var(--muted);
      }
      .kb-search-row {
        display: flex;
        gap: 10px;
      }
      .kb-search-input {
        flex: 1;
        min-width: 0;
        border: 1px solid rgba(60, 44, 28, 0.12);
        background: rgba(255,255,255,0.82);
        border-radius: 16px;
        padding: 14px 16px;
        font-size: 1rem;
      }
      .kb-button {
        border: 0;
        border-radius: 16px;
        padding: 12px 16px;
        font: inherit;
        cursor: pointer;
      }
      .kb-button--primary {
        background: linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%);
        color: white;
      }
      .kb-button--ghost {
        background: rgba(159, 68, 33, 0.08);
        color: var(--brand-strong);
      }
      .kb-main {
        margin-top: 22px;
        display: grid;
        gap: 18px;
      }
      .kb-grid {
        display: grid;
        gap: 18px;
      }
      .kb-grid--split {
        grid-template-columns: 1.4fr 1fr;
      }
      .kb-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 22px;
      }
      .kb-card h2, .kb-card h3, .kb-card h4 {
        margin: 0 0 10px;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif;
      }
      .kb-card p { color: var(--muted); }
      .kb-section-title {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 14px;
      }
      .kb-section-title a {
        color: var(--brand-strong);
        font-size: 0.95rem;
      }
      .kb-list {
        display: grid;
        gap: 12px;
      }
      .kb-list-item {
        padding: 16px 18px;
        border-radius: 20px;
        background: rgba(255,255,255,0.62);
        border: 1px solid rgba(60,44,28,0.08);
      }
      .kb-list-item:hover {
        border-color: rgba(159, 68, 33, 0.2);
        transform: translateY(-1px);
      }
      .kb-eyebrow {
        margin: 0 0 6px;
        letter-spacing: 0.1em;
        font-size: 0.78rem;
        text-transform: uppercase;
        color: var(--brand);
      }
      .kb-item-title {
        margin: 0;
        font-size: 1.08rem;
        color: var(--ink);
      }
      .kb-item-meta {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .kb-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(31, 111, 93, 0.09);
        color: var(--ok);
        font-size: 0.8rem;
      }
      .kb-muted {
        color: var(--muted);
        font-size: 0.92rem;
      }
      .kb-prose {
        display: grid;
        gap: 14px;
      }
      .kb-prose h1,
      .kb-prose h2,
      .kb-prose h3 {
        margin: 18px 0 8px;
        font-family: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif;
      }
      .kb-prose p,
      .kb-prose li {
        color: var(--ink);
        line-height: 1.65;
      }
      .kb-prose ul {
        margin: 0;
        padding-left: 22px;
      }
      .kb-prose a {
        color: var(--brand-strong);
      }
      .kb-prose code {
        font-family: "SFMono-Regular", "Menlo", monospace;
        background: rgba(27, 26, 23, 0.06);
        padding: 2px 6px;
        border-radius: 8px;
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
      .kb-empty {
        padding: 24px;
        border-radius: 18px;
        background: rgba(255,255,255,0.55);
        border: 1px dashed rgba(60,44,28,0.16);
        color: var(--muted);
      }
      .kb-flow-stage {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(217, 164, 65, 0.16);
        color: #7a5617;
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .kb-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }
      .kb-form-stack {
        display: grid;
        gap: 12px;
      }
      .kb-textarea,
      .kb-text-input {
        width: 100%;
        border: 1px solid rgba(60, 44, 28, 0.12);
        background: rgba(255,255,255,0.86);
        border-radius: 16px;
        padding: 14px 16px;
        font: inherit;
      }
      .kb-textarea { min-height: 120px; resize: vertical; }
      .kb-step-list {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }
      .kb-step {
        display: grid;
        grid-template-columns: 38px 1fr;
        gap: 12px;
        align-items: start;
      }
      .kb-step-index {
        width: 38px;
        height: 38px;
        border-radius: 14px;
        display: grid;
        place-items: center;
        background: rgba(159, 68, 33, 0.12);
        color: var(--brand-strong);
        font-weight: 600;
      }
      .kb-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: space-between;
        align-items: center;
      }
      .kb-tenant-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
      }
      .kb-tenant-card {
        padding: 20px;
        border-radius: 24px;
        background: linear-gradient(160deg, rgba(255, 252, 247, 0.95), rgba(247, 236, 223, 0.9));
        border: 1px solid rgba(159, 68, 33, 0.12);
      }
      .kb-tenant-card h3 { margin: 8px 0; }
      .kb-tenant-card p { margin: 0 0 12px; }
      .kb-pill-row { display: flex; flex-wrap: wrap; gap: 8px; }

      @media (max-width: 880px) {
        .kb-grid--split { grid-template-columns: 1fr; }
        .kb-header-top, .kb-toolbar, .kb-search-row { flex-direction: column; align-items: stretch; }
      }
    </style>
  </head>
  <body>
    <div class="kb-shell">
      <header class="kb-header">
        <div class="kb-header-top">
          <a href="/kb" class="kb-brand">
            <div class="kb-mark">KB</div>
            <div>
              <h1 class="kb-brand-title">Merchant Knowledge Center</h1>
              <p class="kb-brand-subtitle">Search, self-serve, and step through live troubleshooting.</p>
            </div>
          </a>
          ${
            tenant
              ? `<div class="kb-tenant-pill"><strong>${escapeHtml(tenant.name)}</strong><span>${escapeHtml(tenant.timezone)}</span></div>`
              : `<div class="kb-tenant-pill">Choose a tenant workspace to explore the demo</div>`
          }
        </div>
        <div class="kb-hero">
          <div>
            <h2 class="kb-title">${escapeHtml(title)}</h2>
            ${subtitle ? `<p class="kb-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          </div>
          ${tenant ? searchForm(tenantPrefix, searchValue) : ""}
        </div>
        ${
          tenant
            ? `<nav class="kb-nav">
                ${navLink("Overview", tenantPrefix, currentPath)}
                ${navLink("Articles", `${tenantPrefix}/articles`, currentPath)}
                ${navLink("Troubleshooting", `${tenantPrefix}/flows`, currentPath)}
                ${navLink("Solved Issues", `${tenantPrefix}/issues`, currentPath)}
              </nav>`
            : ""
        }
      </header>
      <main class="kb-main">${body}</main>
    </div>
    <script>
      document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-speak]");
        if (!button) return;
        const text = button.getAttribute("data-speak");
        if (!text || !("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      });
    </script>
  </body>
</html>`;
}

export function renderTenantChooser(tenants: TenantView[]) {
  const body = tenants.length
    ? `<section class="kb-card">
         <div class="kb-section-title">
           <div>
             <p class="kb-eyebrow">Choose a company portal</p>
             <h2>Open a live merchant knowledge center</h2>
           </div>
         </div>
         <div class="kb-tenant-grid">
           ${tenants
             .map(
               (tenant) => `
                 <a class="kb-tenant-card" href="/kb/${tenant.slug}">
                   <p class="kb-eyebrow">Company portal</p>
                   <h3>${escapeHtml(tenant.name)}</h3>
                   <p>${escapeHtml(tenant.slug)}</p>
                   <div class="kb-pill-row">
                     <span class="kb-badge">${escapeHtml(tenant.timezone)}</span>
                   </div>
                 </a>`,
             )
             .join("")}
         </div>
       </section>`
    : `<section class="kb-card"><div class="kb-empty">No tenants found yet. Create a tenant first, then come back to explore the knowledge center UI.</div></section>`;

  return shell({
    title: "Explore the knowledge experience",
    subtitle: "This read-only UI demonstrates how merchants can search, read help guides, and resolve issues without waiting on support.",
    body,
  });
}

type DashboardItem = {
  id: string;
  slug?: string;
  title: string;
  summary?: string | null;
  symptom?: string;
  status: string;
  updatedAt: Date | string;
};

export function renderTenantDashboard({
  tenant,
  searchValue,
  articles,
  flows,
  issues,
}: {
  tenant: TenantView;
  searchValue?: string;
  articles: DashboardItem[];
  flows: DashboardItem[];
  issues: DashboardItem[];
}) {
  const body = `
    <div class="kb-grid kb-grid--split">
      <section class="kb-card">
        <div class="kb-section-title">
          <div>
            <p class="kb-eyebrow">Value snapshot</p>
            <h2>One destination for merchant self-service</h2>
          </div>
        </div>
        <p>Search for an answer, open a guide, or step through troubleshooting without leaving the portal.</p>
        <div class="kb-pill-row">
          <span class="kb-badge">${articles.length} articles</span>
          <span class="kb-badge">${flows.length} troubleshooting flows</span>
          <span class="kb-badge">${issues.length} solved issues</span>
        </div>
        <div class="kb-actions">
          <a class="kb-button kb-button--primary" href="/kb/${tenant.slug}/flows">Start troubleshooting</a>
          <a class="kb-button kb-button--ghost" href="/kb/${tenant.slug}/articles">Read product guides</a>
        </div>
      </section>
      <section class="kb-card">
        <p class="kb-eyebrow">Voice-guided support</p>
        <h2>Troubleshoot hands-free</h2>
        <p>When a merchant opens a flow, they can press the read-aloud button and follow one step at a time without stopping to read a long article.</p>
        <div class="kb-actions">
          <button class="kb-button kb-button--ghost" type="button" data-speak="Follow one step at a time. If the printer still does not work, continue to the next troubleshooting branch.">Hear a demo step</button>
        </div>
      </section>
    </div>

    <div class="kb-grid kb-grid--split">
      <section class="kb-card">
        <div class="kb-section-title">
          <div>
            <p class="kb-eyebrow">Articles</p>
            <h2>Search and browse product knowledge</h2>
          </div>
          <a href="/kb/${tenant.slug}/articles${searchValue ? `?q=${encodeURIComponent(searchValue)}` : ""}">See all</a>
        </div>
        ${renderItemList(
          articles,
          (item) => `/kb/${tenant.slug}/articles/${item.slug ?? item.id}`,
          "No matching articles yet.",
        )}
      </section>
      <section class="kb-card">
        <div class="kb-section-title">
          <div>
            <p class="kb-eyebrow">Troubleshooting</p>
            <h2>Guided issue resolution</h2>
          </div>
          <a href="/kb/${tenant.slug}/flows${searchValue ? `?q=${encodeURIComponent(searchValue)}` : ""}">See all</a>
        </div>
        ${renderItemList(flows, (item) => `/kb/${tenant.slug}/flows/${item.id}`, "No matching flows yet.")}
      </section>
    </div>

    <section class="kb-card">
      <div class="kb-section-title">
        <div>
          <p class="kb-eyebrow">Solved issues</p>
          <h2>Learn from prior support resolutions</h2>
        </div>
        <a href="/kb/${tenant.slug}/issues${searchValue ? `?q=${encodeURIComponent(searchValue)}` : ""}">See all</a>
      </div>
      ${renderItemList(issues, (item) => `/kb/${tenant.slug}/issues/${item.id}`, "No solved issues match this search yet.")}
    </section>
  `;

  return shell({
    tenant,
    title: searchValue ? `Results for "${searchValue}"` : `Welcome to ${tenant.name}`,
    subtitle: searchValue
      ? "We searched across articles, troubleshooting flows, and solved issues."
      : "Merchants can self-serve from here without needing admin tooling.",
    currentPath: `/kb/${tenant.slug}`,
    searchValue,
    body,
  });
}

function renderItemList(
  items: DashboardItem[],
  hrefFor: (item: DashboardItem) => string,
  emptyMessage: string,
) {
  if (items.length === 0) {
    return `<div class="kb-empty">${escapeHtml(emptyMessage)}</div>`;
  }

  return `<div class="kb-list">
    ${items
      .map(
        (item) => `
          <a class="kb-list-item" href="${hrefFor(item)}">
            <p class="kb-item-title">${escapeHtml(item.title)}</p>
            ${
              item.summary || item.symptom
                ? `<p class="kb-muted">${escapeHtml((item.summary ?? item.symptom ?? "").slice(0, 180))}</p>`
                : ""
            }
            <div class="kb-item-meta">
              ${statusBadge(item.status)}
              <span class="kb-muted">Updated ${formatDate(item.updatedAt)}</span>
            </div>
          </a>`,
      )
      .join("")}
  </div>`;
}

export function renderArticleIndex({
  tenant,
  searchValue,
  articles,
}: {
  tenant: TenantView;
  searchValue?: string;
  articles: Array<{
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    preview: string;
    type: string;
    status: string;
    updatedAt: Date | string;
  }>;
}) {
  const body = `
    <section class="kb-card">
      <div class="kb-toolbar">
        <div>
          <p class="kb-eyebrow">Articles</p>
          <h2>${searchValue ? `Article results for "${escapeHtml(searchValue)}"` : "Product guides and references"}</h2>
        </div>
        ${searchForm(`/kb/${tenant.slug}/articles`, searchValue, true)}
      </div>
      ${
        articles.length
          ? `<div class="kb-list">
               ${articles
                 .map(
                   (article) => `
                     <a class="kb-list-item" href="/kb/${tenant.slug}/articles/${article.slug}">
                       <p class="kb-eyebrow">${escapeHtml(article.type.replace(/_/g, " "))}</p>
                       <p class="kb-item-title">${escapeHtml(article.title)}</p>
                       <p class="kb-muted">${escapeHtml(stripMarkdown(article.summary ?? article.preview).slice(0, 220))}</p>
                       <div class="kb-item-meta">
                         ${statusBadge(article.status)}
                         <span class="kb-muted">Updated ${formatDate(article.updatedAt)}</span>
                       </div>
                     </a>`,
                 )
                 .join("")}
             </div>`
          : `<div class="kb-empty">No articles match this search yet.</div>`
      }
    </section>
  `;

  return shell({
    tenant,
    title: "Browse product knowledge",
    subtitle: "Read setup guides, references, release notes, and feature walkthroughs.",
    currentPath: `/kb/${tenant.slug}/articles`,
    searchValue,
    body,
  });
}

export function renderArticleDetail({
  tenant,
  article,
}: {
  tenant: TenantView;
  article: {
    slug: string;
    currentStatus: string;
    audience: string;
    versions: Array<{
      versionNumber: number;
      title: string;
      summary: string | null;
      body: string;
      updatedAt: Date | string;
    }>;
  };
}) {
  const latestVersion = article.versions[0];
  const speakText = stripMarkdown(`${latestVersion.title}. ${latestVersion.summary ?? ""} ${latestVersion.body}`).slice(0, 1200);

  const body = `
    <section class="kb-card">
      <div class="kb-toolbar">
        <div>
          <p class="kb-eyebrow">Article</p>
          <h2>${escapeHtml(latestVersion.title)}</h2>
        </div>
        <div class="kb-pill-row">
          ${statusBadge(article.currentStatus)}
          ${statusBadge(article.audience)}
        </div>
      </div>
      ${
        latestVersion.summary
          ? `<p class="kb-subtitle">${escapeHtml(latestVersion.summary)}</p>`
          : ""
      }
      <div class="kb-actions">
        <button class="kb-button kb-button--ghost" type="button" data-speak="${escapeHtml(speakText)}">Read this article aloud</button>
        <a class="kb-button kb-button--ghost" href="/kb/${tenant.slug}/articles">Back to articles</a>
      </div>
      <div class="kb-prose">${renderMarkdown(latestVersion.body)}</div>
      <div class="kb-item-meta">
        <span class="kb-muted">Latest version ${latestVersion.versionNumber}</span>
        <span class="kb-muted">Updated ${formatDate(latestVersion.updatedAt)}</span>
      </div>
    </section>
  `;

  return shell({
    tenant,
    title: latestVersion.title,
    subtitle: "Article view",
    currentPath: `/kb/${tenant.slug}/articles`,
    body,
  });
}

export function renderFlowIndex({
  tenant,
  searchValue,
  flows,
}: {
  tenant: TenantView;
  searchValue?: string;
  flows: Array<{
    id: string;
    title: string;
    symptom: string;
    status: string;
    updatedAt: Date | string;
    nodeCount: number;
  }>;
}) {
  const body = `
    <section class="kb-card">
      <div class="kb-toolbar">
        <div>
          <p class="kb-eyebrow">Troubleshooting</p>
          <h2>${searchValue ? `Troubleshooting results for "${escapeHtml(searchValue)}"` : "Guided troubleshooting flows"}</h2>
        </div>
        ${searchForm(`/kb/${tenant.slug}/flows`, searchValue, true)}
      </div>
      ${
        flows.length
          ? `<div class="kb-list">
               ${flows
                 .map(
                   (flow) => `
                     <a class="kb-list-item" href="/kb/${tenant.slug}/flows/${flow.id}">
                       <p class="kb-item-title">${escapeHtml(flow.title)}</p>
                       <p class="kb-muted">${escapeHtml(flow.symptom)}</p>
                       <div class="kb-item-meta">
                         ${statusBadge(flow.status)}
                         <span class="kb-muted">${flow.nodeCount} nodes</span>
                         <span class="kb-muted">Updated ${formatDate(flow.updatedAt)}</span>
                       </div>
                     </a>`,
                 )
                 .join("")}
             </div>`
          : `<div class="kb-empty">No troubleshooting flows match this search yet.</div>`
      }
    </section>
  `;

  return shell({
    tenant,
    title: "Run guided troubleshooting",
    subtitle: "Pick a symptom and step through one instruction at a time.",
    currentPath: `/kb/${tenant.slug}/flows`,
    searchValue,
    body,
  });
}

export function renderFlowDetail({
  tenant,
  flow,
}: {
  tenant: TenantView;
  flow: {
    id: string;
    title: string;
    symptom: string;
    status: string;
    nodes: Array<{ id: string; nodeType: string; title: string; body: string | null; voiceText: string | null }>;
    edges: Array<unknown>;
  };
}) {
  const startNode = flow.nodes.find((node) => node.nodeType === "start") ?? flow.nodes[0];
  const speakText = stripMarkdown(startNode?.voiceText ?? startNode?.body ?? startNode?.title ?? flow.symptom);

  const body = `
    <section class="kb-card">
      <div class="kb-toolbar">
        <div>
          <p class="kb-eyebrow">Troubleshooting flow</p>
          <h2>${escapeHtml(flow.title)}</h2>
        </div>
        <div class="kb-pill-row">
          ${statusBadge(flow.status)}
          <span class="kb-badge">${flow.nodes.length} steps</span>
        </div>
      </div>
      <p class="kb-subtitle">${escapeHtml(flow.symptom)}</p>
      <div class="kb-actions">
        <form method="post" action="/kb/${tenant.slug}/flows/${flow.id}/start">
          <button class="kb-button kb-button--primary" type="submit">Start guided troubleshooting</button>
        </form>
        <button class="kb-button kb-button--ghost" type="button" data-speak="${escapeHtml(speakText)}">Hear the first step</button>
      </div>
      <div class="kb-step-list">
        ${flow.nodes
          .map(
            (node, index) => `
              <div class="kb-step">
                <div class="kb-step-index">${index + 1}</div>
                <div>
                  <div class="kb-flow-stage">${escapeHtml(node.nodeType)}</div>
                  <h3>${escapeHtml(node.title)}</h3>
                  ${node.body ? `<p>${escapeHtml(node.body)}</p>` : ""}
                </div>
              </div>`,
          )
          .join("")}
      </div>
    </section>
  `;

  return shell({
    tenant,
    title: flow.title,
    subtitle: "Open the guided session to move step by step.",
    currentPath: `/kb/${tenant.slug}/flows`,
    body,
  });
}

export function renderFlowSession({
  tenant,
  flow,
  session,
  currentNode,
  outgoingEdges,
}: {
  tenant: TenantView;
  flow: { id: string; title: string; symptom: string };
  session: { id: string; status: string; mode: string };
  currentNode: { id: string; nodeType: string; title: string; body: string | null; voiceText: string | null } | null;
  outgoingEdges: Array<{ id: string; conditionType: string; conditionValue: string | null }>;
}) {
  const speakText = stripMarkdown(currentNode?.voiceText ?? currentNode?.body ?? currentNode?.title ?? flow.symptom);

  let actionMarkup = "";

  if (session.status === "completed" || currentNode?.nodeType === "outcome") {
    actionMarkup = `<div class="kb-empty">This troubleshooting run has reached an outcome. You can return to the flow list or start again.</div>`;
  } else if (outgoingEdges.length === 1 && outgoingEdges[0].conditionType === "always") {
    actionMarkup = `
      <form class="kb-form-stack" method="post" action="/kb/${tenant.slug}/sessions/${session.id}/advance">
        <input type="hidden" name="answer" value="continue" />
        <button class="kb-button kb-button--primary" type="submit">Continue</button>
      </form>
    `;
  } else if (outgoingEdges.length > 0 && outgoingEdges.every((edge) => edge.conditionType === "answer_equals" && edge.conditionValue)) {
    actionMarkup = `
      <div class="kb-actions">
        ${outgoingEdges
          .map(
            (edge) => `
              <form method="post" action="/kb/${tenant.slug}/sessions/${session.id}/advance">
                <input type="hidden" name="answer" value="${escapeHtml(edge.conditionValue ?? "")}" />
                <button class="kb-button kb-button--primary" type="submit">${escapeHtml(edge.conditionValue ?? "Choose")}</button>
              </form>`,
          )
          .join("")}
      </div>
    `;
  } else {
    actionMarkup = `
      <form class="kb-form-stack" method="post" action="/kb/${tenant.slug}/sessions/${session.id}/advance">
        <label class="kb-search-label" for="session-answer">What happened after this step?</label>
        <input id="session-answer" class="kb-text-input" type="text" name="answer" placeholder="Type what you observed" required />
        <button class="kb-button kb-button--primary" type="submit">Submit answer</button>
      </form>
    `;
  }

  const body = `
    <section class="kb-card">
      <div class="kb-toolbar">
        <div>
          <p class="kb-eyebrow">Live troubleshooting session</p>
          <h2>${escapeHtml(flow.title)}</h2>
        </div>
        <div class="kb-pill-row">
          ${statusBadge(session.status)}
          ${statusBadge(session.mode)}
        </div>
      </div>
      <p class="kb-subtitle">${escapeHtml(flow.symptom)}</p>
      ${
        currentNode
          ? `<div class="kb-step-list">
               <div class="kb-step">
                 <div class="kb-step-index">•</div>
                 <div>
                   <div class="kb-flow-stage">${escapeHtml(currentNode.nodeType)}</div>
                   <h3>${escapeHtml(currentNode.title)}</h3>
                   ${currentNode.body ? `<p>${escapeHtml(currentNode.body)}</p>` : ""}
                 </div>
               </div>
             </div>`
          : `<div class="kb-empty">No current node is attached to this session.</div>`
      }
      <div class="kb-actions">
        <button class="kb-button kb-button--ghost" type="button" data-speak="${escapeHtml(speakText)}">Read this step aloud</button>
        <a class="kb-button kb-button--ghost" href="/kb/${tenant.slug}/flows/${flow.id}">Back to flow overview</a>
      </div>
      ${actionMarkup}
    </section>
  `;

  return shell({
    tenant,
    title: flow.title,
    subtitle: "Follow the next step and keep moving without losing context.",
    currentPath: `/kb/${tenant.slug}/flows`,
    body,
  });
}

export function renderSolvedIssueIndex({
  tenant,
  searchValue,
  issues,
}: {
  tenant: TenantView;
  searchValue?: string;
  issues: Array<{
    id: string;
    title: string;
    symptom: string;
    rootCause: string | null;
    status: string;
    updatedAt: Date | string;
    stepCount: number;
  }>;
}) {
  const body = `
    <section class="kb-card">
      <div class="kb-toolbar">
        <div>
          <p class="kb-eyebrow">Solved issues</p>
          <h2>${searchValue ? `Resolved issue results for "${escapeHtml(searchValue)}"` : "Resolved support knowledge"}</h2>
        </div>
        ${searchForm(`/kb/${tenant.slug}/issues`, searchValue, true)}
      </div>
      ${
        issues.length
          ? `<div class="kb-list">
               ${issues
                 .map(
                   (issue) => `
                     <a class="kb-list-item" href="/kb/${tenant.slug}/issues/${issue.id}">
                       <p class="kb-item-title">${escapeHtml(issue.title)}</p>
                       <p class="kb-muted">${escapeHtml(issue.symptom)}</p>
                       <div class="kb-item-meta">
                         ${statusBadge(issue.status)}
                         <span class="kb-muted">${issue.stepCount} resolution steps</span>
                         <span class="kb-muted">Updated ${formatDate(issue.updatedAt)}</span>
                       </div>
                     </a>`,
                 )
                 .join("")}
             </div>`
          : `<div class="kb-empty">No solved issues match this search yet.</div>`
      }
    </section>
  `;

  return shell({
    tenant,
    title: "Browse solved issues",
    subtitle: "Reuse proven fixes instead of rediscovering them under pressure.",
    currentPath: `/kb/${tenant.slug}/issues`,
    searchValue,
    body,
  });
}

export function renderSolvedIssueDetail({
  tenant,
  issue,
}: {
  tenant: TenantView;
  issue: {
    title: string;
    symptom: string;
    rootCause: string | null;
    status: string;
    updatedAt: Date | string;
    steps: Array<{ stepNumber: number; body: string }>;
  };
}) {
  const speakText = stripMarkdown(`${issue.title}. ${issue.symptom}. ${issue.steps.map((step) => step.body).join(" ")}`).slice(0, 1200);

  const body = `
    <section class="kb-card">
      <div class="kb-toolbar">
        <div>
          <p class="kb-eyebrow">Solved issue</p>
          <h2>${escapeHtml(issue.title)}</h2>
        </div>
        <div class="kb-pill-row">
          ${statusBadge(issue.status)}
          <span class="kb-muted">Updated ${formatDate(issue.updatedAt)}</span>
        </div>
      </div>
      <p class="kb-subtitle">${escapeHtml(issue.symptom)}</p>
      ${
        issue.rootCause
          ? `<div class="kb-list-item"><p class="kb-eyebrow">Root cause</p><p>${escapeHtml(issue.rootCause)}</p></div>`
          : ""
      }
      <div class="kb-actions">
        <button class="kb-button kb-button--ghost" type="button" data-speak="${escapeHtml(speakText)}">Read this fix aloud</button>
        <a class="kb-button kb-button--ghost" href="/kb/${tenant.slug}/issues">Back to solved issues</a>
      </div>
      <div class="kb-step-list">
        ${issue.steps
          .map(
            (step) => `
              <div class="kb-step">
                <div class="kb-step-index">${step.stepNumber}</div>
                <div>
                  <h3>Step ${step.stepNumber}</h3>
                  <p>${escapeHtml(step.body)}</p>
                </div>
              </div>`,
          )
          .join("")}
      </div>
    </section>
  `;

  return shell({
    tenant,
    title: issue.title,
    subtitle: "A reusable resolution captured from prior support work.",
    currentPath: `/kb/${tenant.slug}/issues`,
    body,
  });
}
