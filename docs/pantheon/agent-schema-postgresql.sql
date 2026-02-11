-- Pantheon Agent Lifecycle Schema (PostgreSQL)
-- Scope: templates, models, agents, idempotency, lifecycle history
-- Laravel note: assumes table "users" already exists (Laravel 12 app DB).
-- If users.id is UUID, keep this schema as-is. If users.id is bigint, adjust FK types accordingly.

create extension if not exists pgcrypto;

-- =========================
-- Enums
-- =========================

create type agent_type as enum ('ENTRY', 'SERVICE', 'ORCHESTRATOR');

create type agent_lifecycle_state as enum (
  'pending',
  'provisioning',
  'workspace_ready',
  'registering',
  'registered',
  'activating',
  'active',
  'deactivating',
  'inactive',
  'error'
);

create type desired_state as enum ('active', 'inactive');

create type template_status as enum ('draft', 'active', 'deprecated', 'archived');
create type model_status as enum ('draft', 'active', 'deprecated', 'archived');

create type operation_status as enum ('received', 'processing', 'completed', 'failed', 'ignored_stale');

-- =========================
-- Templates (managed by API)
-- =========================

create table if not exists agent_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  template_version text not null,
  schema_version text not null,
  status template_status not null default 'active',
  storage_uri text not null,
  checksum_sha256 text not null,
  content_snapshot jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, template_version)
);

-- =========================
-- Models (managed by API)
-- =========================

create table if not exists agent_models (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  model_version text not null,
  model_type agent_type not null,
  compatible_template_key text not null,
  compatible_template_version text not null,
  schema_version text not null,
  status model_status not null default 'active',
  yaml_source text,
  normalized_config jsonb not null,
  checksum_sha256 text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (model_key, model_version)
);

create index if not exists agent_models_type_idx on agent_models (model_type);

-- =========================
-- Agents
-- =========================

create table if not exists agents (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,

  name text not null,
  type agent_type not null,
  domain text not null,

  template_id uuid not null references agent_templates(id),
  model_id uuid not null references agent_models(id),

  lifecycle_state agent_lifecycle_state not null default 'pending',
  desired_state desired_state not null default 'active',
  is_enabled boolean not null default true,

  generation integer not null default 1,
  desired_generation integer not null default 1,
  applied_generation integer,

  active_workspace_path text not null,
  disabled_workspace_path text not null,
  current_workspace_path text not null,

  runtime_agent_id text,
  runtime_registered boolean not null default false,
  runtime_config_revision bigint,

  heartbeat_every text,
  model_primary text,
  model_fallbacks jsonb not null default '[]'::jsonb,
  compaction_mode text,
  max_concurrent integer,
  subagents_max_concurrent integer,

  identity_override jsonb not null default '{}'::jsonb,
  soul_override jsonb not null default '{}'::jsonb,
  governance_override jsonb not null default '{}'::jsonb,
  decision_override jsonb not null default '{}'::jsonb,
  user_context_override jsonb not null default '{}'::jsonb,

  last_error_code text,
  last_error_message text,
  failed_step text,
  retry_count integer not null default 0,

  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint agents_current_path_valid check (
    current_workspace_path = active_workspace_path
    or current_workspace_path = disabled_workspace_path
  ),

  constraint agents_generation_valid check (
    generation >= 1 and desired_generation >= 1
  )
);

create index if not exists agents_user_id_idx on agents (user_id);
create index if not exists agents_lifecycle_state_idx on agents (lifecycle_state);
create index if not exists agents_desired_state_idx on agents (desired_state);
create index if not exists agents_runtime_registered_idx on agents (runtime_registered);

-- Optional uniqueness per user and human-readable name.
create unique index if not exists agents_user_name_uk on agents (user_id, name);

-- =========================
-- Runtime bindings (optional; can be materialized into openclaw.json)
-- =========================

create table if not exists agent_bindings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id) on delete cascade,
  channel text not null,
  match_filter jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_bindings_agent_id_idx on agent_bindings (agent_id);
create index if not exists agent_bindings_channel_idx on agent_bindings (channel);

-- =========================
-- Idempotency and operation tracking
-- =========================

create table if not exists agent_operations (
  operation_id uuid primary key,
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  event_name text not null,
  generation integer not null,
  status operation_status not null default 'received',
  payload jsonb not null,
  result jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_operations_agent_id_idx on agent_operations (agent_id, created_at desc);
create index if not exists agent_operations_event_idx on agent_operations (event_name, created_at desc);

-- =========================
-- Lifecycle audit trail
-- =========================

create table if not exists agent_lifecycle_events (
  id bigserial primary key,
  operation_id uuid references agent_operations(operation_id),
  agent_id uuid not null references agents(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  event_name text not null,
  from_state agent_lifecycle_state,
  to_state agent_lifecycle_state,
  generation integer not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  inserted_at timestamptz not null default now()
);

create index if not exists agent_lifecycle_events_agent_id_idx on agent_lifecycle_events (agent_id, occurred_at desc);
create index if not exists agent_lifecycle_events_operation_id_idx on agent_lifecycle_events (operation_id);

-- =========================
-- Trigger helper for updated_at
-- =========================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_agent_templates_updated_at
before update on agent_templates
for each row execute function set_updated_at();

create trigger trg_agent_models_updated_at
before update on agent_models
for each row execute function set_updated_at();

create trigger trg_agents_updated_at
before update on agents
for each row execute function set_updated_at();

create trigger trg_agent_bindings_updated_at
before update on agent_bindings
for each row execute function set_updated_at();

create trigger trg_agent_operations_updated_at
before update on agent_operations
for each row execute function set_updated_at();
