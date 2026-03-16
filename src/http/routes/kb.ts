import { Hono } from "hono";
import type { Database } from "../../db/client";
import { AppError } from "../../lib/errors";
import { listKnowledgeBaseArticles, getContentBySlug } from "../../repositories/content";
import { advanceFlowSession, getFlowById, getFlowSessionById, listFlows, startFlowSession } from "../../repositories/flows";
import { listSolvedIssues, getSolvedIssueById } from "../../repositories/solved-issues";
import { getTenantBySlug, listTenants } from "../../repositories/tenants";
import {
  renderArticleDetail,
  renderArticleIndex,
  renderFlowDetail,
  renderFlowIndex,
  renderFlowSession,
  renderSolvedIssueDetail,
  renderSolvedIssueIndex,
  renderTenantChooser,
  renderTenantDashboard,
} from "../views/knowledge-base";

function findPreferredTenants<T extends { slug: string; name: string }>(tenants: T[]) {
  const demoTenants = tenants.filter(
    (tenant) =>
      tenant.slug.toLowerCase().includes("demo") || tenant.name.toLowerCase().includes("demo"),
  );

  return demoTenants.length > 0 ? demoTenants : tenants;
}

async function requireTenant(database: Database, tenantSlug: string) {
  const tenant = await getTenantBySlug(database, tenantSlug);

  if (!tenant) {
    throw new AppError(404, "not_found", "Tenant workspace not found.");
  }

  return tenant;
}

function parseSearch(search?: string) {
  return search?.trim() ? search.trim() : undefined;
}

export function createKnowledgeBaseRouter(database: Database) {
  const router = new Hono();

  router.get("/", async (context) => {
    const tenants = findPreferredTenants(await listTenants(database));

    if (tenants.length === 1) {
      return context.redirect(`/kb/${tenants[0].slug}`);
    }

    return context.html(
      renderTenantChooser(
        tenants.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          timezone: tenant.timezone,
        })),
      ),
    );
  });

  router.get("/:tenantSlug", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const q = parseSearch(context.req.query("q"));

    const [articles, allFlows, issues] = await Promise.all([
      listKnowledgeBaseArticles(database, tenant.id, { q, limit: 6 }),
      listFlows(database, tenant.id, { limit: 12, status: "published" }),
      listSolvedIssues(database, tenant.id, { q, limit: 6 }),
    ]);

    const flows = allFlows
      .filter((flow) => flow.audience !== "internal")
      .filter((flow) => {
        if (!q) {
          return true;
        }

        const haystack = `${flow.title}\n${flow.symptom}`.toLowerCase();
        return haystack.includes(q.toLowerCase());
      })
      .slice(0, 6);

    return context.html(
      renderTenantDashboard({
        tenant,
        searchValue: q,
        articles,
        flows,
        issues,
      }),
    );
  });

  router.get("/:tenantSlug/articles", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const q = parseSearch(context.req.query("q"));
    const articles = await listKnowledgeBaseArticles(database, tenant.id, { q, limit: 24 });
    return context.html(renderArticleIndex({ tenant, searchValue: q, articles }));
  });

  router.get("/:tenantSlug/articles/:contentSlug", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const article = await getContentBySlug(database, tenant.id, context.req.param("contentSlug"));

    if (!article || article.currentStatus !== "published" || article.audience === "internal") {
      throw new AppError(404, "not_found", "Article not found.");
    }

    return context.html(renderArticleDetail({ tenant, article }));
  });

  router.get("/:tenantSlug/flows", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const q = parseSearch(context.req.query("q"));
    const allFlows = await listFlows(database, tenant.id, { limit: 48, status: "published" });
    const flows = allFlows
      .filter((flow) => flow.audience !== "internal")
      .filter((flow) => {
        if (!q) {
          return true;
        }

        const haystack = `${flow.title}\n${flow.symptom}`.toLowerCase();
        return haystack.includes(q.toLowerCase());
      })
      .slice(0, 24);

    return context.html(renderFlowIndex({ tenant, searchValue: q, flows }));
  });

  router.get("/:tenantSlug/flows/:flowId", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const flow = await getFlowById(database, tenant.id, context.req.param("flowId"));

    if (flow.status !== "published" || flow.audience === "internal") {
      throw new AppError(404, "not_found", "Troubleshooting flow not found.");
    }

    return context.html(renderFlowDetail({ tenant, flow }));
  });

  router.post("/:tenantSlug/flows/:flowId/start", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const flow = await getFlowById(database, tenant.id, context.req.param("flowId"));

    if (flow.status !== "published" || flow.audience === "internal") {
      throw new AppError(404, "not_found", "Troubleshooting flow not found.");
    }

    const result = await startFlowSession(database, tenant.id, context.req.param("flowId"), { mode: "text" });
    return context.redirect(`/kb/${tenant.slug}/sessions/${result.session.id}`);
  });

  router.get("/:tenantSlug/sessions/:sessionId", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const sessionView = await getFlowSessionById(database, tenant.id, context.req.param("sessionId"));

    if (!sessionView) {
      throw new AppError(404, "not_found", "Troubleshooting session not found.");
    }

    return context.html(renderFlowSession({ tenant, ...sessionView }));
  });

  router.post("/:tenantSlug/sessions/:sessionId/advance", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const formData = await context.req.formData();
    const answer = String(formData.get("answer") ?? "").trim();

    if (!answer) {
      throw new AppError(400, "validation_error", "Answer is required to continue troubleshooting.", {
        field: "answer",
      });
    }

    await advanceFlowSession(database, tenant.id, context.req.param("sessionId"), { answer });
    return context.redirect(`/kb/${tenant.slug}/sessions/${context.req.param("sessionId")}`);
  });

  router.get("/:tenantSlug/issues", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const q = parseSearch(context.req.query("q"));
    const issues = await listSolvedIssues(database, tenant.id, { q, limit: 24 });
    return context.html(renderSolvedIssueIndex({ tenant, searchValue: q, issues }));
  });

  router.get("/:tenantSlug/issues/:issueId", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const issue = await getSolvedIssueById(database, tenant.id, context.req.param("issueId"));

    if (!issue || issue.status !== "published" || issue.audienceRecommendation === "internal") {
      throw new AppError(404, "not_found", "Solved issue not found.");
    }

    return context.html(renderSolvedIssueDetail({ tenant, issue }));
  });

  return router;
}
