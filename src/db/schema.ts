import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import {
  appRoleValues,
  audienceTypeValues,
  conditionTypeValues,
  contentTypeValues,
  deviceCategoryValues,
  flowNodeTypeValues,
  issueStatusValues,
  mediaKindValues,
  messageRoleValues,
  processingStatusValues,
  sourceTypeValues,
  workflowStatusValues,
} from "../domain/constants";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const appRoleEnum = pgEnum("app_role", appRoleValues);
export const contentTypeEnum = pgEnum("content_type", contentTypeValues);
export const workflowStatusEnum = pgEnum("workflow_status", workflowStatusValues);
export const audienceTypeEnum = pgEnum("audience_type", audienceTypeValues);
export const sourceTypeEnum = pgEnum("source_type", sourceTypeValues);
export const mediaKindEnum = pgEnum("media_kind", mediaKindValues);
export const processingStatusEnum = pgEnum("processing_status", processingStatusValues);
export const deviceCategoryEnum = pgEnum("device_category", deviceCategoryValues);
export const flowNodeTypeEnum = pgEnum("flow_node_type", flowNodeTypeValues);
export const conditionTypeEnum = pgEnum("condition_type", conditionTypeValues);
export const messageRoleEnum = pgEnum("message_role", messageRoleValues);
export const issueStatusEnum = pgEnum("issue_status", issueStatusValues);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    slugUnique: uniqueIndex("tenants_slug_unique").on(table.slug),
  }),
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const memberships = pgTable(
  "memberships",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: appRoleEnum("role").notNull(),
    createdAt: createdAt(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.userId] }),
    userIdx: index("idx_memberships_user_id").on(table.userId),
  }),
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantSlugUnique: uniqueIndex("products_tenant_slug_unique").on(table.tenantId, table.slug),
    tenantIdx: index("idx_products_tenant_id").on(table.tenantId),
  }),
);

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantSlugUnique: uniqueIndex("modules_tenant_slug_unique").on(table.tenantId, table.slug),
    tenantProductIdx: index("idx_modules_tenant_product").on(table.tenantId, table.productId),
  }),
);

export const deviceModels = pgTable(
  "device_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
    vendor: text("vendor").notNull(),
    model: text("model").notNull(),
    category: deviceCategoryEnum("category").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    vendorModelUnique: uniqueIndex("device_models_tenant_vendor_model_unique").on(
      table.tenantId,
      table.vendor,
      table.model,
    ),
    tenantProductIdx: index("idx_device_models_tenant_product").on(table.tenantId, table.productId),
  }),
);

export const deviceModelAliases = pgTable(
  "device_model_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceModelId: uuid("device_model_id")
      .notNull()
      .references(() => deviceModels.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
  },
  (table) => ({
    aliasUnique: uniqueIndex("device_model_aliases_device_alias_unique").on(
      table.deviceModelId,
      table.alias,
    ),
    deviceModelIdx: index("idx_device_model_aliases_device_model").on(table.deviceModelId),
  }),
);

export const releaseVersions = pgTable(
  "release_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    channel: text("channel").notNull().default("stable"),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    productVersionUnique: uniqueIndex("release_versions_tenant_product_version_channel_unique").on(
      table.tenantId,
      table.productId,
      table.version,
      table.channel,
    ),
    tenantProductIdx: index("idx_release_versions_tenant_product").on(table.tenantId, table.productId),
  }),
);

export const glossaryTerms = pgTable(
  "glossary_terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    canonicalTerm: text("canonical_term").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    termUnique: uniqueIndex("glossary_terms_tenant_term_unique").on(
      table.tenantId,
      table.canonicalTerm,
    ),
  }),
);

export const glossaryAliases = pgTable(
  "glossary_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    glossaryTermId: uuid("glossary_term_id")
      .notNull()
      .references(() => glossaryTerms.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
  },
  (table) => ({
    aliasUnique: uniqueIndex("glossary_aliases_term_alias_unique").on(
      table.glossaryTermId,
      table.alias,
    ),
  }),
);

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    type: contentTypeEnum("type").notNull(),
    currentStatus: workflowStatusEnum("current_status").notNull().default("draft"),
    audience: audienceTypeEnum("audience").notNull(),
    slug: text("slug").notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    // Drizzle generation becomes unstable with this circular foreign key.
    // Keep the column typed here and enforce the FK in manual SQL if needed.
    currentPublishedVersionId: uuid("current_published_version_id"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    slugUnique: uniqueIndex("content_items_tenant_slug_unique").on(table.tenantId, table.slug),
    tenantStatusIdx: index("idx_content_items_tenant_status").on(table.tenantId, table.currentStatus),
  }),
);

export const contentVersions = pgTable(
  "content_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    bodyFormat: text("body_format").notNull().default("md"),
    body: text("body").notNull(),
    status: workflowStatusEnum("status").notNull().default("draft"),
    changeSummary: text("change_summary"),
    createdBy: uuid("created_by").references(() => users.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    itemVersionUnique: uniqueIndex("content_versions_item_version_unique").on(
      table.contentItemId,
      table.versionNumber,
    ),
    itemStatusIdx: index("idx_content_versions_item_status").on(table.contentItemId, table.status),
  }),
);

export const contentItemProducts = pgTable(
  "content_item_products",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.productId] }),
  }),
);

export const contentItemModules = pgTable(
  "content_item_modules",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.moduleId] }),
  }),
);

export const contentItemDeviceModels = pgTable(
  "content_item_device_models",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    deviceModelId: uuid("device_model_id")
      .notNull()
      .references(() => deviceModels.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.deviceModelId] }),
  }),
);

export const contentItemReleaseVersions = pgTable(
  "content_item_release_versions",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    releaseVersionId: uuid("release_version_id")
      .notNull()
      .references(() => releaseVersions.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.releaseVersionId] }),
  }),
);

export const contentItemVerticals = pgTable(
  "content_item_verticals",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    vertical: text("vertical").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.vertical] }),
  }),
);

export const contentItemTags = pgTable(
  "content_item_tags",
  {
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contentItemId, table.tag] }),
  }),
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    linkedContentItemId: uuid("linked_content_item_id").references(() => contentItems.id, {
      onDelete: "set null",
    }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    mediaKind: mediaKindEnum("media_kind").notNull(),
    storageKey: text("storage_key"),
    externalUrl: text("external_url"),
    title: text("title").notNull(),
    durationMs: integer("duration_ms"),
    processingStatus: processingStatusEnum("processing_status").notNull().default("queued"),
    transcriptStatus: processingStatusEnum("transcript_status").notNull().default("queued"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantStatusIdx: index("idx_media_assets_tenant_status").on(table.tenantId, table.processingStatus),
  }),
);

export const recordingSessions = pgTable(
  "recording_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id),
    title: text("title").notNull(),
    mode: text("mode").notNull(),
    mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    status: processingStatusEnum("status").notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantStatusIdx: index("idx_recording_sessions_tenant_status").on(table.tenantId, table.status),
  }),
);

export const transcriptSegments = pgTable(
  "transcript_segments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    segmentIndex: integer("segment_index").notNull(),
    startMs: integer("start_ms").notNull(),
    endMs: integer("end_ms").notNull(),
    text: text("text").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: createdAt(),
  },
  (table) => ({
    segmentUnique: uniqueIndex("transcript_segments_media_asset_segment_unique").on(
      table.mediaAssetId,
      table.segmentIndex,
    ),
    mediaAssetIdx: index("idx_transcript_segments_media_asset").on(table.mediaAssetId),
  }),
);

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
    tenantStatusIdx: index("idx_troubleshooting_flows_tenant_status").on(
      table.tenantId,
      table.status,
    ),
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

export const solvedIssueDrafts = pgTable("solved_issue_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  solvedIssueId: uuid("solved_issue_id")
    .notNull()
    .references(() => solvedIssues.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  contentItemId: uuid("content_item_id").references(() => contentItems.id, { onDelete: "set null" }),
  flowId: uuid("flow_id").references(() => troubleshootingFlows.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const sourceImports = pgTable(
  "source_imports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    sourceUrl: text("source_url").notNull(),
    linkedContentItemId: uuid("linked_content_item_id").references(() => contentItems.id, {
      onDelete: "set null",
    }),
    status: processingStatusEnum("status").notNull().default("queued"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantStatusIdx: index("idx_source_imports_tenant_status").on(table.tenantId, table.status),
  }),
);

export const contentChunks = pgTable(
  "content_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    contentVersionId: uuid("content_version_id").references(() => contentVersions.id, {
      onDelete: "cascade",
    }),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: createdAt(),
  },
  (table) => ({
    versionChunkUnique: uniqueIndex("content_chunks_version_chunk_unique").on(
      table.contentVersionId,
      table.chunkIndex,
    ),
    contentItemIdx: index("idx_content_chunks_content_item").on(table.contentItemId),
  }),
);

export const chatSessions = pgTable(
  "chat_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    moduleId: uuid("module_id").references(() => modules.id, { onDelete: "set null" }),
    deviceModelId: uuid("device_model_id").references(() => deviceModels.id, {
      onDelete: "set null",
    }),
    releaseVersionId: uuid("release_version_id").references(() => releaseVersions.id, {
      onDelete: "set null",
    }),
    audience: audienceTypeEnum("audience").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => ({
    tenantUserIdx: index("idx_chat_sessions_tenant_user").on(table.tenantId, table.userId),
  }),
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatSessionId: uuid("chat_session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    body: text("body").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }),
    createdAt: createdAt(),
  },
  (table) => ({
    sessionIdx: index("idx_chat_messages_session_id").on(table.chatSessionId),
  }),
);

export const answerCitations = pgTable(
  "answer_citations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    chatMessageId: uuid("chat_message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    contentItemId: uuid("content_item_id").references(() => contentItems.id, { onDelete: "set null" }),
    contentVersionId: uuid("content_version_id").references(() => contentVersions.id, {
      onDelete: "set null",
    }),
    mediaAssetId: uuid("media_asset_id").references(() => mediaAssets.id, { onDelete: "set null" }),
    transcriptSegmentId: uuid("transcript_segment_id").references(() => transcriptSegments.id, {
      onDelete: "set null",
    }),
    snippet: text("snippet").notNull(),
    createdAt: createdAt(),
  },
  (table) => ({
    messageIdx: index("idx_answer_citations_message_id").on(table.chatMessageId),
  }),
);

export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => ({
    tenantTypeIdx: index("idx_usage_events_tenant_type").on(
      table.tenantId,
      table.eventType,
      table.createdAt,
    ),
  }),
);
