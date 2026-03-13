import { and, eq, inArray } from "drizzle-orm";
import type { CreateSolvedIssueInput } from "../api/contracts";
import type { Database } from "../db/client";
import { deviceModels, products } from "../db/schema/catalog";
import {
  solvedIssueDeviceModels,
  solvedIssueProducts,
  solvedIssues,
  solvedIssueSteps,
} from "../db/schema/support";
import { AppError } from "../lib/errors";
import type { DbExecutor } from "./shared";

async function assertProductIds(executor: DbExecutor, tenantId: string, productIds: string[]) {
  if (productIds.length === 0) {
    return;
  }

  const rows = await executor
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)));

  if (rows.length !== new Set(productIds).size) {
    throw new AppError(400, "validation_error", "One or more products do not belong to the tenant.", {
      field: "productIds",
    });
  }
}

async function assertDeviceModelIds(executor: DbExecutor, tenantId: string, deviceModelIds: string[]) {
  if (deviceModelIds.length === 0) {
    return;
  }

  const rows = await executor
    .select({ id: deviceModels.id })
    .from(deviceModels)
    .where(and(eq(deviceModels.tenantId, tenantId), inArray(deviceModels.id, deviceModelIds)));

  if (rows.length !== new Set(deviceModelIds).size) {
    throw new AppError(400, "validation_error", "One or more device models do not belong to the tenant.", {
      field: "deviceModelIds",
    });
  }
}

export async function createSolvedIssue(database: Database, tenantId: string, input: CreateSolvedIssueInput) {
  return database.transaction(async (tx) => {
    await Promise.all([
      assertProductIds(tx, tenantId, input.productIds),
      assertDeviceModelIds(tx, tenantId, input.deviceModelIds),
    ]);

    const [issue] = await tx
      .insert(solvedIssues)
      .values({
        tenantId,
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
        title: input.title,
        symptom: input.symptom,
        rootCause: input.rootCause,
        audienceRecommendation: input.audienceRecommendation,
        status: "draft",
      })
      .returning();

    if (input.productIds.length > 0) {
      await tx.insert(solvedIssueProducts).values(
        input.productIds.map((productId) => ({
          solvedIssueId: issue.id,
          productId,
        })),
      );
    }

    if (input.deviceModelIds.length > 0) {
      await tx.insert(solvedIssueDeviceModels).values(
        input.deviceModelIds.map((deviceModelId) => ({
          solvedIssueId: issue.id,
          deviceModelId,
        })),
      );
    }

    await tx.insert(solvedIssueSteps).values(
      input.resolutionSteps.map((body, index) => ({
        solvedIssueId: issue.id,
        stepNumber: index + 1,
        body,
      })),
    );

    return issue;
  });
}

export async function listSolvedIssues(
  database: Database,
  tenantId: string,
  options: { q?: string; limit?: number } = {},
) {
  const issues = await database
    .select()
    .from(solvedIssues)
    .where(eq(solvedIssues.tenantId, tenantId));

  const visibleIssues = issues.filter(
    (issue) => issue.audienceRecommendation !== "internal" && issue.status !== "archived",
  );

  if (visibleIssues.length === 0) {
    return [];
  }

  const steps = await database
    .select()
    .from(solvedIssueSteps)
    .where(inArray(solvedIssueSteps.solvedIssueId, visibleIssues.map((issue) => issue.id)));

  const stepCountByIssueId = new Map<string, number>();
  for (const step of steps) {
    stepCountByIssueId.set(step.solvedIssueId, (stepCountByIssueId.get(step.solvedIssueId) ?? 0) + 1);
  }

  const query = options.q?.trim().toLowerCase();

  return visibleIssues
    .map((issue) => ({
      ...issue,
      stepCount: stepCountByIssueId.get(issue.id) ?? 0,
    }))
    .filter((issue) => {
      if (!query) {
        return true;
      }

      const haystack = `${issue.title}\n${issue.symptom}\n${issue.rootCause ?? ""}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, options.limit ?? 12);
}

export async function getSolvedIssueById(database: Database, tenantId: string, issueId: string) {
  const [issue] = await database
    .select()
    .from(solvedIssues)
    .where(and(eq(solvedIssues.id, issueId), eq(solvedIssues.tenantId, tenantId)))
    .limit(1);

  if (!issue) {
    return null;
  }

  const [steps, productLinks, deviceLinks] = await Promise.all([
    database
      .select()
      .from(solvedIssueSteps)
      .where(eq(solvedIssueSteps.solvedIssueId, issueId)),
    database
      .select()
      .from(solvedIssueProducts)
      .where(eq(solvedIssueProducts.solvedIssueId, issueId)),
    database
      .select()
      .from(solvedIssueDeviceModels)
      .where(eq(solvedIssueDeviceModels.solvedIssueId, issueId)),
  ]);

  return {
    ...issue,
    productIds: productLinks.map((row) => row.productId),
    deviceModelIds: deviceLinks.map((row) => row.deviceModelId),
    steps: steps.sort((left, right) => left.stepNumber - right.stepNumber),
  };
}
