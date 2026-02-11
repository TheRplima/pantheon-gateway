# Pantheon Agent Lifecycle Async (Target Design)

## Purpose

Define an asynchronous, idempotent lifecycle for agent provisioning and operations, where:

- API is the source of truth for agent metadata and status.
- Workspace generation is delegated to `agent-factory` via RabbitMQ.
- Gateway runtime registration is applied only after workspace creation succeeds.
- Activation and deactivation are state-driven and reversible.

This document is aligned with:

- Runtime behavior documented in `docs/pantheon/agent-architecture-as-is.md`.
- Factory assets in `/home/rodrigo/projects/pantheon/core/configs/skills/agent-factory`.

## Canonical Identity and Paths

- `agent_id`: UUID (required).
- `user_id`: UUID (required).
- Active workspace path: `/home/node/workspaces/{user_id}/{agent_id}`.
- Disabled workspace path: `/home/node/workspaces/{user_id}/disabled/{agent_id}`.

Rules:

- Exactly one effective workspace location exists per agent at any given time.
- `current_workspace_path` must always point to either active or disabled path.
- Activation moves disabled -> active.
- Deactivation moves active -> disabled.

## States and State Machine

Persisted lifecycle states:

- `pending`: API accepted creation request; waiting for factory execution.
- `provisioning`: factory is creating/updating workspace from template/model.
- `workspace_ready`: workspace created and validated.
- `registering`: runtime config (`agents.list`) update in progress.
- `registered`: runtime config updated; awaiting gateway reload/restart.
- `activating`: startup/reload process in progress.
- `active`: runtime routing can target this agent.
- `deactivating`: draining/routing removal/workspace move in progress.
- `inactive`: agent disabled; workspace parked in disabled path.
- `error`: failure state; retryable with idempotency controls.

State constraints:

- `active` requires workspace at active path and runtime registration present.
- `inactive` requires workspace at disabled path and no active routing.
- `error` stores structured failure reason and failed step.

## End-to-End Async Flows

### 1. Create Agent

1. API validates request (`agent_id`, `user_id`, template/model references, role/domain, config).
2. API stores agent as `pending` with `desired_state = active` (or `inactive`, if requested).
3. API publishes `agent.provision.requested` to RabbitMQ.
4. Factory consumes event, renders template/model, creates workspace at active path.
5. Factory publishes `agent.workspace.ready` with rendered metadata and checksums.
6. API marks `workspace_ready` and publishes `agent.runtime.register.requested`.
7. Runtime worker updates `runtime/config/openclaw.json` (`agents.list`, optional bindings).
8. Runtime worker publishes `agent.runtime.registered`.
9. API marks `registered`, publishes `agent.activation.requested`.
10. Runtime worker reloads/restarts gateway safely and validates health.
11. Runtime worker publishes `agent.activated`.
12. API marks `active`.

### 2. Update Agent (Template/Model/Config)

1. API stores new `desired_revision` and marks `provisioning`.
2. API publishes `agent.provision.requested` with incremented `generation`.
3. Factory rebuilds workspace in-place (or stage+swap), preserving selected protected artifacts by policy.
4. Same registration/reload flow as creation.
5. API updates `applied_revision` and returns to `active` or `inactive` per `desired_state`.

### 3. Deactivate Agent

1. API sets `desired_state = inactive`, state `deactivating`.
2. API publishes `agent.deactivation.requested`.
3. Runtime worker disables routing/registration for the agent and drains active executions.
4. Workspace mover shifts active path -> disabled path.
5. Worker publishes `agent.deactivated`.
6. API marks `inactive`, updates `current_workspace_path`.

### 4. Activate Agent

1. API sets `desired_state = active`, state `activating`.
2. API publishes `agent.activation.requested`.
3. Workspace mover shifts disabled path -> active path.
4. Runtime worker ensures `agents.list` registration and reload/restart.
5. Worker publishes `agent.activated`.
6. API marks `active`, updates `current_workspace_path`.

## Queue Topology

Recommended exchanges and routing keys:

- Exchange `pantheon.agent.lifecycle` (topic).
- Routing keys:
  - `agent.provision.requested`
  - `agent.workspace.ready`
  - `agent.runtime.register.requested`
  - `agent.runtime.registered`
  - `agent.activation.requested`
  - `agent.activated`
  - `agent.deactivation.requested`
  - `agent.deactivated`
  - `agent.failed`

Recommended queues:

- `q.agent.factory` (provisioning workers).
- `q.agent.runtime` (registration/reload workers).
- `q.agent.workspace.move` (activate/deactivate path movers).
- `q.agent.api.callback` (status callbacks to API).
- `q.agent.dlq` (dead-letter queue).

## Idempotency, Ordering, and Concurrency

Use these controls on all workers:

- Idempotency key: `operation_id` UUID in every event.
- Optimistic ordering key: `generation` monotonic integer per agent.
- Ignore stale events when `generation < current_generation`.
- Per-agent distributed lock: `agent:{agent_id}`.
- Retry with backoff for transient failures.
- Send terminal failures as `agent.failed` with structured error payload.

Operational recommendation:

- Debounce gateway reload/restart to batch multiple register/unregister operations into a short window.

## What Must Be Stored in DB (from Factory Analysis)

Based on template `v2.5` and model YAML files, database persistence should separate:

- Template-managed defaults (mostly static files).
- Model specialization inputs (identity, soul, governance, decision, io, onboarding).
- Agent-instance overrides (user-specific and runtime-specific customizations).

Minimum persisted data for reproducible generation:

- Identity: `name`, `emoji`, `creature`, `vibe`, `avatar`.
- Classification: `type` (`ENTRY|SERVICE|ORCHESTRATOR`), `domain`.
- Soul: `purpose`, `principles`.
- Governance: `allowed`, `prohibited`, `domain_rules`, `red_flags`, `quality_standards`, `execution_model`.
- Decision: `proactivity`, `rules`, `gates`, `schema`, `manifest`, optional `registry_list`, `state_rows`.
- IO contracts: `io.input`, `io.output`.
- Onboarding and context policy blocks (especially for ENTRY).
- Template metadata: `template_key`, `template_version`, compatible schema version.
- Model metadata: `model_key`, `model_version`, model snapshot checksum.

Important implementation note:

- Factory currently fills placeholders from model and supports role blocks.
- Role blocks with comma-separated targets in template (example: `ENTRY,SERVICE`) are not matched by current regex and require parser enhancement if strict rendering is required.

## Template and Model Management in API

API should expose CRUD for:

- Templates (key, version, storage, checksums, status).
- Models (key, role/type, version, compatible template, YAML content, checksums, status).

Versioning policy:

- Agent stores both desired and applied references.
- Template/model updates are immutable by version; new content produces a new version.

## Failure Modes and Recovery

Common failure points:

- Workspace creation failure.
- Runtime registration write conflict.
- Gateway reload failure.
- Filesystem move failure on activate/deactivate.

Recovery policy:

- Persist `last_error_code`, `last_error_message`, `failed_step`, `retry_count`.
- Allow manual retry by republishing the same `operation_id` (idempotent).
- Support operator override to force transition to `inactive` safe state.

## Acceptance Criteria

- Creating an agent via API reaches `active` asynchronously without manual file editing.
- Deactivation moves workspace to `/home/node/workspaces/{user_id}/disabled/{agent_id}` and runtime stops routing to agent.
- Activation moves workspace back to `/home/node/workspaces/{user_id}/{agent_id}` and runtime resumes routing.
- Duplicate events do not cause duplicate side effects.
- Out-of-order events are ignored safely via `generation`.
