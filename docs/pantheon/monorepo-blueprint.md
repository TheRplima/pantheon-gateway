# Pantheon Monorepo Blueprint

## Objective

Adopt a single repository layout for Pantheon services, with clear ownership boundaries and shared event contracts, while keeping the current gateway runtime stable during migration.

## Source Of Truth (Current)

For Pantheon domain changes (API/contracts/docs), this repository is the only authoritative source.

- Formalization record: `docs/pantheon/cutover-formalization-2026-02-14.md`
- Legacy repo status: historical reference only

## Target Layout

- `apps/gateway`: existing OpenClaw gateway codebase (current root project).
- `apps/api`: Laravel 12 API (agent ownership, lifecycle orchestration, persistence).
- `apps/web`: frontend application (operator/admin UI).
- `packages/contracts`: versioned async event contracts and payload schemas shared across services.
- `infra/`: local and CI infra assets (compose overlays, RabbitMQ topology, observability configs).
- `docs/pantheon`: architecture, lifecycle, runbooks, schemas, rollout plans.

## Migration Strategy

1. **Bootstrap phase (non-breaking)**
   - Keep current gateway in place.
   - Introduce `apps/api`, `apps/web`, `packages/contracts` directories.
   - Define contracts and ownership boundaries first.
2. **Integration phase**
   - Add async workers and event publishers/consumers using `packages/contracts`.
   - Wire API lifecycle with factory and gateway through RabbitMQ.
3. **Consolidation phase**
   - Move or mirror gateway-specific scripts/docs into `apps/gateway` if needed.
   - Keep compatibility shims until CI/CD and operations are fully aligned.

## Service Boundaries

- `gateway`
  - Consumes lifecycle commands relevant to runtime activation/deactivation.
  - Publishes runtime state transitions (`registered`, `active`, `error`).
- `api` (Laravel)
  - Source of truth for users, agents, templates, models, and operation state.
  - Publishes desired-state commands (`create`, `update`, `activate`, `deactivate`).
  - Consumes worker/gateway feedback events and updates DB state machine.
- `factory`
  - Consumes desired-state commands.
  - Generates or reconciles workspace artifacts.
  - Publishes operation outcomes.

## Contracts Package Policy

- Event schemas are immutable per version (`v1`, `v2`, ...).
- Breaking changes require a new versioned schema.
- Producers must include `event_version` and `event_type`.
- Consumers must fail closed on unknown mandatory fields.

## Repository Decisions (Current)

- Keep `runtime/` ignored from git for now.
- Keep gateway build/test commands unchanged.
- Introduce monorepo folders incrementally; avoid disruptive root refactors until async flow is running.

## Phase 1 Exit Criteria

- `apps/api`, `apps/web`, and `packages/contracts` exist with clear ownership docs.
- Monorepo blueprint documented and aligned with async lifecycle artifacts.
- No change in current gateway behavior/build pipeline.
