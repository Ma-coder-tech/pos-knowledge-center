CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

CREATE TYPE app_role AS ENUM (
  'org_admin',
  'knowledge_manager',
  'support_agent',
  'merchant'
);

CREATE TYPE content_type AS ENUM (
  'article',
  'video',
  'checklist',
  'reference_doc',
  'release_note'
);

CREATE TYPE workflow_status AS ENUM (
  'draft',
  'in_review',
  'published',
  'retired'
);

CREATE TYPE audience_type AS ENUM (
  'internal',
  'merchant',
  'both'
);

CREATE TYPE source_type AS ENUM (
  'native',
  'upload',
  'youtube',
  'web',
  'pdf',
  'ticket',
  'call'
);

CREATE TYPE media_kind AS ENUM (
  'video',
  'audio',
  'image'
);

CREATE TYPE processing_status AS ENUM (
  'queued',
  'processing',
  'ready',
  'failed'
);

CREATE TYPE device_category AS ENUM (
  'printer',
  'register',
  'payment_terminal',
  'scanner',
  'cash_drawer',
  'router',
  'other'
);

CREATE TYPE flow_node_type AS ENUM (
  'start',
  'step',
  'question',
  'outcome'
);

CREATE TYPE condition_type AS ENUM (
  'always',
  'answer_equals',
  'answer_not_equals'
);

CREATE TYPE message_role AS ENUM (
  'system',
  'user',
  'assistant',
  'tool'
);

CREATE TYPE issue_status AS ENUM (
  'draft',
  'reviewed',
  'published',
  'archived'
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE device_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  vendor TEXT NOT NULL,
  model TEXT NOT NULL,
  category device_category NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, vendor, model)
);

CREATE TABLE device_model_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_model_id UUID NOT NULL REFERENCES device_models(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  UNIQUE (device_model_id, alias)
);

CREATE TABLE release_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'stable',
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, product_id, version, channel)
);

CREATE TABLE glossary_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  canonical_term TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, canonical_term)
);

CREATE TABLE glossary_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glossary_term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  UNIQUE (glossary_term_id, alias)
);

CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type content_type NOT NULL,
  current_status workflow_status NOT NULL DEFAULT 'draft',
  audience audience_type NOT NULL,
  slug TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  current_published_version_id UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_format TEXT NOT NULL DEFAULT 'md',
  body TEXT NOT NULL,
  status workflow_status NOT NULL DEFAULT 'draft',
  change_summary TEXT,
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_item_id, version_number)
);

ALTER TABLE content_items
ADD CONSTRAINT fk_content_items_current_published_version
FOREIGN KEY (current_published_version_id)
REFERENCES content_versions(id)
ON DELETE SET NULL;

CREATE TABLE content_item_products (
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (content_item_id, product_id)
);

CREATE TABLE content_item_modules (
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  PRIMARY KEY (content_item_id, module_id)
);

CREATE TABLE content_item_device_models (
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  device_model_id UUID NOT NULL REFERENCES device_models(id) ON DELETE CASCADE,
  PRIMARY KEY (content_item_id, device_model_id)
);

CREATE TABLE content_item_release_versions (
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  release_version_id UUID NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
  PRIMARY KEY (content_item_id, release_version_id)
);

CREATE TABLE content_item_verticals (
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  vertical TEXT NOT NULL,
  PRIMARY KEY (content_item_id, vertical)
);

CREATE TABLE content_item_tags (
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (content_item_id, tag)
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  linked_content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  source_type source_type NOT NULL,
  media_kind media_kind NOT NULL,
  storage_key TEXT,
  external_url TEXT,
  title TEXT NOT NULL,
  duration_ms INTEGER,
  processing_status processing_status NOT NULL DEFAULT 'queued',
  transcript_status processing_status NOT NULL DEFAULT 'queued',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  title TEXT NOT NULL,
  mode TEXT NOT NULL,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  status processing_status NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_asset_id, segment_index)
);

CREATE TABLE troubleshooting_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  symptom TEXT NOT NULL,
  audience audience_type NOT NULL,
  status workflow_status NOT NULL DEFAULT 'draft',
  linked_content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE troubleshooting_flow_products (
  flow_id UUID NOT NULL REFERENCES troubleshooting_flows(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (flow_id, product_id)
);

CREATE TABLE troubleshooting_flow_device_models (
  flow_id UUID NOT NULL REFERENCES troubleshooting_flows(id) ON DELETE CASCADE,
  device_model_id UUID NOT NULL REFERENCES device_models(id) ON DELETE CASCADE,
  PRIMARY KEY (flow_id, device_model_id)
);

CREATE TABLE flow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES troubleshooting_flows(id) ON DELETE CASCADE,
  node_type flow_node_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  voice_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE flow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES troubleshooting_flows(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES flow_nodes(id) ON DELETE CASCADE,
  condition_type condition_type NOT NULL DEFAULT 'always',
  condition_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE flow_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES troubleshooting_flows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  audience audience_type NOT NULL,
  mode TEXT NOT NULL,
  current_node_id UUID REFERENCES flow_nodes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE flow_session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_session_id UUID NOT NULL REFERENCES flow_sessions(id) ON DELETE CASCADE,
  node_id UUID REFERENCES flow_nodes(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE solved_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type source_type NOT NULL,
  source_reference TEXT,
  title TEXT NOT NULL,
  symptom TEXT NOT NULL,
  root_cause TEXT,
  audience_recommendation audience_type NOT NULL DEFAULT 'internal',
  status issue_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE solved_issue_products (
  solved_issue_id UUID NOT NULL REFERENCES solved_issues(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (solved_issue_id, product_id)
);

CREATE TABLE solved_issue_device_models (
  solved_issue_id UUID NOT NULL REFERENCES solved_issues(id) ON DELETE CASCADE,
  device_model_id UUID NOT NULL REFERENCES device_models(id) ON DELETE CASCADE,
  PRIMARY KEY (solved_issue_id, device_model_id)
);

CREATE TABLE solved_issue_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solved_issue_id UUID NOT NULL REFERENCES solved_issues(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (solved_issue_id, step_number)
);

CREATE TABLE solved_issue_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solved_issue_id UUID NOT NULL REFERENCES solved_issues(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  flow_id UUID REFERENCES troubleshooting_flows(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE source_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type source_type NOT NULL,
  source_url TEXT NOT NULL,
  linked_content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  status processing_status NOT NULL DEFAULT 'queued',
  last_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE content_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content_item_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  content_version_id UUID REFERENCES content_versions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_version_id, chunk_index)
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
  device_model_id UUID REFERENCES device_models(id) ON DELETE SET NULL,
  release_version_id UUID REFERENCES release_versions(id) ON DELETE SET NULL,
  audience audience_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  body TEXT NOT NULL,
  confidence NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE answer_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES content_items(id) ON DELETE SET NULL,
  content_version_id UUID REFERENCES content_versions(id) ON DELETE SET NULL,
  media_asset_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  transcript_segment_id UUID REFERENCES transcript_segments(id) ON DELETE SET NULL,
  snippet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_modules_tenant_product ON modules(tenant_id, product_id);
CREATE INDEX idx_device_models_tenant_product ON device_models(tenant_id, product_id);
CREATE INDEX idx_device_model_aliases_device_model ON device_model_aliases(device_model_id);
CREATE INDEX idx_release_versions_tenant_product ON release_versions(tenant_id, product_id);
CREATE INDEX idx_content_items_tenant_status ON content_items(tenant_id, current_status);
CREATE INDEX idx_content_versions_item_status ON content_versions(content_item_id, status);
CREATE INDEX idx_media_assets_tenant_status ON media_assets(tenant_id, processing_status);
CREATE INDEX idx_recording_sessions_tenant_status ON recording_sessions(tenant_id, status);
CREATE INDEX idx_transcript_segments_media_asset ON transcript_segments(media_asset_id);
CREATE INDEX idx_troubleshooting_flows_tenant_status ON troubleshooting_flows(tenant_id, status);
CREATE INDEX idx_flow_nodes_flow_id ON flow_nodes(flow_id);
CREATE INDEX idx_flow_edges_flow_id ON flow_edges(flow_id);
CREATE INDEX idx_flow_sessions_flow_id ON flow_sessions(flow_id);
CREATE INDEX idx_solved_issues_tenant_status ON solved_issues(tenant_id, status);
CREATE INDEX idx_source_imports_tenant_status ON source_imports(tenant_id, status);
CREATE INDEX idx_content_chunks_content_item ON content_chunks(content_item_id);
CREATE INDEX idx_chat_sessions_tenant_user ON chat_sessions(tenant_id, user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(chat_session_id);
CREATE INDEX idx_answer_citations_message_id ON answer_citations(chat_message_id);
CREATE INDEX idx_usage_events_tenant_type ON usage_events(tenant_id, event_type, created_at DESC);

CREATE INDEX idx_content_chunks_embedding
ON content_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_transcript_segments_embedding
ON transcript_segments
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
