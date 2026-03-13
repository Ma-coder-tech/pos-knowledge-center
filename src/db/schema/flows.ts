import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { audienceTypeEnum, conditionTypeEnum, createdAt, flowNodeTypeEnum, updatedAt, workflowStatusEnum } from "./base";
import { deviceModels, products } from "./catalog";
import { contentItems } from "./content";
import { tenants, users } from "./core";

export const troubleshootingFlows = pgTable(
  "troubleshooting_flows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    symptom: text("symptom").notNull(),
    audience: audienceTypeEnum("audience").notNull(),
    status: workflowStatusEnum("status").notNull().default("draft"),
    linkedContentItemId: uuid("linked_content_item_id").references(() => contentItems.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantStatusIdx: index("idx_troubleshooting_flows_tenant_status").on(table.tenantId, table.status),
  }),
);

export const troubleshootingFlowProducts = pgTable(
  "troubleshooting_flow_products",
  {
    flowId: uuid("flow_id")
      .notNull()
      .references(() => troubleshootingFlows.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.flowId, table.productId] }),
  }),
);

export const troubleshootingFlowDeviceModels = pgTable(
  "troubleshooting_flow_device_models",
  {
    flowId: uuid("flow_id")
      .notNull()
      .references(() => troubleshootingFlows.id, { onDelete: "cascade" }),
    deviceModelId: uuid("device_model_id")
      .notNull()
      .references(() => deviceModels.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.flowId, table.deviceModelId] }),
  }),
);

export const flowNodes = pgTable(
  "flow_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => troubleshootingFlows.id, { onDelete: "cascade" }),
    nodeType: flowNodeTypeEnum("node_type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    voiceText: text("voice_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    flowIdx: index("idx_flow_nodes_flow_id").on(table.flowId),
  }),
);

export const flowEdges = pgTable(
  "flow_edges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => troubleshootingFlows.id, { onDelete: "cascade" }),
    fromNodeId: uuid("from_node_id")
      .notNull()
      .references(() => flowNodes.id, { onDelete: "cascade" }),
    toNodeId: uuid("to_node_id")
      .notNull()
      .references(() => flowNodes.id, { onDelete: "cascade" }),
    conditionType: conditionTypeEnum("condition_type").notNull().default("always"),
    conditionValue: text("condition_value"),
    createdAt: createdAt(),
  },
  (table) => ({
    flowIdx: index("idx_flow_edges_flow_id").on(table.flowId),
  }),
);

export const flowSessions = pgTable(
  "flow_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    flowId: uuid("flow_id")
      .notNull()
      .references(() => troubleshootingFlows.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    audience: audienceTypeEnum("audience").notNull(),
    mode: text("mode").notNull(),
    currentNodeId: uuid("current_node_id").references(() => flowNodes.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => ({
    flowIdx: index("idx_flow_sessions_flow_id").on(table.flowId),
  }),
);

export const flowSessionEvents = pgTable("flow_session_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  flowSessionId: uuid("flow_session_id")
    .notNull()
    .references(() => flowSessions.id, { onDelete: "cascade" }),
  nodeId: uuid("node_id").references(() => flowNodes.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  answer: text("answer"),
  createdAt: createdAt(),
});
