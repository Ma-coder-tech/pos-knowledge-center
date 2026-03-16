import { Hono } from "hono";
import type { AudienceType } from "../../domain/constants";
import type { Database } from "../../db/client";
import { AppError } from "../../lib/errors";
import {
  createContent,
  createContentVersion,
  getContentById,
  listAdminArticles,
  publishLatestContent,
} from "../../repositories/content";
import {
  createFlow,
  createFlowEdge,
  createFlowNode,
  listFlows,
  publishFlow,
} from "../../repositories/flows";
import {
  createSolvedIssue,
  listAdminSolvedIssues,
  publishSolvedIssue,
} from "../../repositories/solved-issues";
import { getTenantBySlug, listTenants } from "../../repositories/tenants";
import { renderAdminArticleEditor, renderAdminChooser, renderAdminDashboard } from "../views/admin";

function parseAudience(value: FormDataEntryValue | null): AudienceType {
  if (value === "merchant" || value === "both" || value === "internal") {
    return value;
  }

  return "merchant";
}

function isChecked(value: FormDataEntryValue | null) {
  return value === "yes" || value === "on" || value === "true";
}

function parseRequiredString(formData: FormData, field: string) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    throw new AppError(400, "validation_error", `${field} is required.`, { field });
  }

  return value;
}

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
    throw new AppError(404, "not_found", "Team workspace not found.");
  }

  return tenant;
}

export function createAdminRouter(database: Database) {
  const router = new Hono();

  router.get("/", async (context) => {
    const tenants = findPreferredTenants(await listTenants(database));

    if (tenants.length === 1) {
      return context.redirect(`/admin/${tenants[0].slug}`);
    }

    return context.html(
      renderAdminChooser(
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
    const [articles, flows, issues] = await Promise.all([
      listAdminArticles(database, tenant.id, { limit: 24 }),
      listFlows(database, tenant.id, { limit: 24 }),
      listAdminSolvedIssues(database, tenant.id, { limit: 24 }),
    ]);

    return context.html(
      renderAdminDashboard({
        tenant,
        articles,
        flows,
        issues,
      }),
    );
  });

  router.post("/:tenantSlug/articles", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const formData = await context.req.formData();
    const result = await createContent(database, tenant.id, {
      type: "article",
      title: parseRequiredString(formData, "title"),
      summary: String(formData.get("summary") ?? "").trim() || undefined,
      audience: parseAudience(formData.get("audience")),
      body: {
        format: "md",
        value: parseRequiredString(formData, "body"),
      },
      productIds: [],
      moduleIds: [],
      deviceModelIds: [],
      releaseVersionIds: [],
      verticals: [],
      tags: [],
    });

    if (isChecked(formData.get("publishNow"))) {
      await publishLatestContent(database, tenant.id, result.content.id);
    }

    return context.redirect(`/admin/${tenant.slug}`);
  });

  router.post("/:tenantSlug/articles/:contentId/publish", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    await publishLatestContent(database, tenant.id, context.req.param("contentId"));
    return context.redirect(`/admin/${tenant.slug}`);
  });

  router.get("/:tenantSlug/articles/:contentId/edit", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const article = await getContentById(database, tenant.id, context.req.param("contentId"));

    if (!article || article.versions.length === 0) {
      throw new AppError(404, "not_found", "Article not found.");
    }

    const latestVersion = article.versions[0];

    return context.html(
      renderAdminArticleEditor({
        tenant,
        article: {
          id: article.id,
          slug: article.slug,
          currentStatus: article.currentStatus,
          audience: article.audience,
          title: latestVersion.title,
          summary: latestVersion.summary,
          body: latestVersion.body,
          versionNumber: latestVersion.versionNumber,
        },
      }),
    );
  });

  router.post("/:tenantSlug/articles/:contentId", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const contentId = context.req.param("contentId");
    const formData = await context.req.formData();

    await createContentVersion(database, tenant.id, contentId, {
      title: parseRequiredString(formData, "title"),
      summary: String(formData.get("summary") ?? "").trim() || undefined,
      body: {
        format: "md",
        value: parseRequiredString(formData, "body"),
      },
      changeSummary: "Updated from the team workspace editor.",
    });

    if (isChecked(formData.get("publishNow"))) {
      await publishLatestContent(database, tenant.id, contentId);
    }

    return context.redirect(`/admin/${tenant.slug}/articles/${contentId}/edit`);
  });

  router.post("/:tenantSlug/flows", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const formData = await context.req.formData();
    const audience = parseAudience(formData.get("audience"));

    const flow = await createFlow(database, tenant.id, {
      title: parseRequiredString(formData, "title"),
      symptom: parseRequiredString(formData, "symptom"),
      audience,
      productIds: [],
      deviceModelIds: [],
    });

    const startNode = await createFlowNode(database, tenant.id, flow.id, {
      nodeType: "start",
      title: "Start troubleshooting",
      body: parseRequiredString(formData, "startBody"),
      voiceText: parseRequiredString(formData, "startBody"),
      sortOrder: 0,
    });

    const questionBody = parseRequiredString(formData, "questionBody");
    const questionNode = await createFlowNode(database, tenant.id, flow.id, {
      nodeType: "question",
      title: parseRequiredString(formData, "questionTitle"),
      body: questionBody,
      voiceText: questionBody,
      sortOrder: 1,
    });

    const yesOutcomeBody = parseRequiredString(formData, "yesOutcomeBody");
    const yesOutcome = await createFlowNode(database, tenant.id, flow.id, {
      nodeType: "outcome",
      title: "Resolved",
      body: yesOutcomeBody,
      voiceText: yesOutcomeBody,
      sortOrder: 2,
    });

    const noOutcomeBody = parseRequiredString(formData, "noOutcomeBody");
    const noOutcome = await createFlowNode(database, tenant.id, flow.id, {
      nodeType: "outcome",
      title: "Still not working",
      body: noOutcomeBody,
      voiceText: noOutcomeBody,
      sortOrder: 3,
    });

    await createFlowEdge(database, tenant.id, flow.id, {
      fromNodeId: startNode.id,
      toNodeId: questionNode.id,
      conditionType: "always",
    });
    await createFlowEdge(database, tenant.id, flow.id, {
      fromNodeId: questionNode.id,
      toNodeId: yesOutcome.id,
      conditionType: "answer_equals",
      conditionValue: "yes",
    });
    await createFlowEdge(database, tenant.id, flow.id, {
      fromNodeId: questionNode.id,
      toNodeId: noOutcome.id,
      conditionType: "answer_equals",
      conditionValue: "no",
    });

    if (isChecked(formData.get("publishNow"))) {
      await publishFlow(database, tenant.id, flow.id);
    }

    return context.redirect(`/admin/${tenant.slug}`);
  });

  router.post("/:tenantSlug/flows/:flowId/publish", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    await publishFlow(database, tenant.id, context.req.param("flowId"));
    return context.redirect(`/admin/${tenant.slug}`);
  });

  router.post("/:tenantSlug/issues", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    const formData = await context.req.formData();
    const resolutionSteps = parseRequiredString(formData, "resolutionSteps")
      .split(/\n+/)
      .map((step) => step.trim())
      .filter(Boolean);

    const issue = await createSolvedIssue(database, tenant.id, {
      sourceType: "ticket",
      sourceReference: undefined,
      title: parseRequiredString(formData, "title"),
      symptom: parseRequiredString(formData, "symptom"),
      rootCause: String(formData.get("rootCause") ?? "").trim() || undefined,
      resolutionSteps,
      deviceModelIds: [],
      productIds: [],
      audienceRecommendation: parseAudience(formData.get("audienceRecommendation")),
    });

    if (isChecked(formData.get("publishNow"))) {
      await publishSolvedIssue(database, tenant.id, issue.id);
    }

    return context.redirect(`/admin/${tenant.slug}`);
  });

  router.post("/:tenantSlug/issues/:issueId/publish", async (context) => {
    const tenant = await requireTenant(database, context.req.param("tenantSlug"));
    await publishSolvedIssue(database, tenant.id, context.req.param("issueId"));
    return context.redirect(`/admin/${tenant.slug}`);
  });

  return router;
}
