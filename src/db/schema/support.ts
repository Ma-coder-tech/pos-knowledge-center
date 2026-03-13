import { index, integer, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { audienceTypeEnum, createdAt, issueStatusEnum, sourceTypeEnum, updatedAt } from "./base";
import { deviceModels, products } from "./catalog";
import { tenants, users } from "./core";

export const solvedIssues = pgTable(
  "solved_issues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceReference: text("source_reference"),
    title: text("title").notNull(),
    symptom: text("symptom").notNull(),
    rootCause: text("root_cause"),
    audienceRecommendation: audienceTypeEnum("audience_recommendation")
      .notNull()
      .default("internal"),
    status: issueStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantStatusIdx: index("idx_solved_issues_tenant_status").on(table.tenantId, table.status),
  }),
);

export const solvedIssueProducts = pgTable(
  "solved_issue_products",
  {
    solvedIssueId: uuid("solved_issue_id")
      .notNull()
      .references(() => solvedIssues.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.solvedIssueId, table.productId] }),
  }),
);

export const solvedIssueDeviceModels = pgTable(
  "solved_issue_device_models",
  {
    solvedIssueId: uuid("solved_issue_id")
      .notNull()
      .references(() => solvedIssues.id, { onDelete: "cascade" }),
    deviceModelId: uuid("device_model_id")
      .notNull()
      .references(() => deviceModels.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.solvedIssueId, table.deviceModelId] }),
  }),
);

export const solvedIssueSteps = pgTable(
  "solved_issue_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    solvedIssueId: uuid("solved_issue_id")
      .notNull()
      .references(() => solvedIssues.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (table) => ({
    stepUnique: uniqueIndex("solved_issue_steps_issue_step_unique").on(
      table.solvedIssueId,
      table.stepNumber,
    ),
  }),
);
