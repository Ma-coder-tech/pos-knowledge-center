export const appRoleValues = [
  "org_admin",
  "knowledge_manager",
  "support_agent",
  "merchant",
] as const;

export const contentTypeValues = [
  "article",
  "video",
  "checklist",
  "reference_doc",
  "release_note",
] as const;

export const workflowStatusValues = [
  "draft",
  "in_review",
  "published",
  "retired",
] as const;

export const audienceTypeValues = ["internal", "merchant", "both"] as const;

export const sourceTypeValues = [
  "native",
  "upload",
  "youtube",
  "web",
  "pdf",
  "ticket",
  "call",
] as const;

export const mediaKindValues = ["video", "audio", "image"] as const;

export const processingStatusValues = [
  "queued",
  "processing",
  "ready",
  "failed",
] as const;

export const deviceCategoryValues = [
  "printer",
  "register",
  "payment_terminal",
  "scanner",
  "cash_drawer",
  "router",
  "other",
] as const;

export const flowNodeTypeValues = ["start", "step", "question", "outcome"] as const;

export const conditionTypeValues = [
  "always",
  "answer_equals",
  "answer_not_equals",
] as const;

export const messageRoleValues = ["system", "user", "assistant", "tool"] as const;

export const issueStatusValues = [
  "draft",
  "reviewed",
  "published",
  "archived",
] as const;

export const recordingModeValues = [
  "screen",
  "camera",
  "screen_and_camera",
] as const;

export type AppRole = (typeof appRoleValues)[number];
export type ContentType = (typeof contentTypeValues)[number];
export type WorkflowStatus = (typeof workflowStatusValues)[number];
export type AudienceType = (typeof audienceTypeValues)[number];
export type SourceType = (typeof sourceTypeValues)[number];
export type MediaKind = (typeof mediaKindValues)[number];
export type ProcessingStatus = (typeof processingStatusValues)[number];
export type DeviceCategory = (typeof deviceCategoryValues)[number];
export type FlowNodeType = (typeof flowNodeTypeValues)[number];
export type ConditionType = (typeof conditionTypeValues)[number];
export type MessageRole = (typeof messageRoleValues)[number];
export type IssueStatus = (typeof issueStatusValues)[number];
export type RecordingMode = (typeof recordingModeValues)[number];

