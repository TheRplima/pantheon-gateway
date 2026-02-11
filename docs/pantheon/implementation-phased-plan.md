# Pantheon Async Lifecycle Implementation Plan (Phased)

## Goal

Implement asynchronous agent lifecycle on the gateway side with deterministic behavior, idempotency, and safe runtime updates.

## Phase 1 — Core Lifecycle MVP

### Scope

- RabbitMQ consumer/producer infrastructure for lifecycle events.
- DB writes for `agents`, `agent_operations`, `agent_lifecycle_events`.
- Factory provisioning integration.
- Runtime registration update (`agents.list`) and activation path.

### Deliverables

- Lifecycle worker module (consume/process/publish).
- Operation idempotency service (`operation_id`).
- State transition service with guards.
- Runtime config atomic writer for `runtime/config/openclaw.json`.

### Done criteria

- Create flow reaches `active` asynchronously.
- Duplicate event does not duplicate effects.
- Stale generation is ignored.
- Failures emit `agent.failed` and set state `error`.

## Phase 2 — Deactivation/Activation Hardening

### Scope

- Full activate/deactivate mechanics with workspace moves.
- Runtime unregister/routing removal.
- Gateway reload debounce and healthcheck.

### Deliverables

- Workspace move service (active <-> disabled paths).
- Deactivation drain policy (`graceful`/`force`).
- Reload scheduler/debouncer.

### Done criteria

- Deactivate always ends with workspace in disabled path and no routing.
- Activate always restores active path and routing.
- Reload batches operations and reports health outcome.

## Phase 3 — Observability and Reliability

### Scope

- Metrics, structured logs, alert-ready failure signals.
- Retry strategy + DLQ handling policy.
- Operational runbook and failure drills.

### Deliverables

- Structured logging with correlation fields.
- Metrics exporter counters/histograms.
- Retry/backoff + DLQ integration.
- Operator runbook docs.

### Done criteria

- Operators can trace any operation end-to-end by `operation_id`.
- Retry/DLQ behavior is deterministic and documented.
- Common failure modes tested in staging.

## Phase 4 — Template/Model Governance (Preparation)

### Scope

- Prepare gateway side for richer template/model version contracts.
- Keep current package-level model, no granular template files yet.

### Deliverables

- Strict validation of template/model checksum in provisioning path.
- Version compatibility checks (`compatible_template`).
- Contract extension points for future `template_files` and `model_components`.

### Done criteria

- Provisioning rejects incompatible template/model pairs.
- Checksum mismatches fail early with actionable errors.

## Suggested Module Breakdown (Gateway Side)

- `src/pantheon/lifecycle/consumer.ts`
- `src/pantheon/lifecycle/publisher.ts`
- `src/pantheon/lifecycle/state-machine.ts`
- `src/pantheon/lifecycle/idempotency.ts`
- `src/pantheon/runtime/config-writer.ts`
- `src/pantheon/runtime/reload-coordinator.ts`
- `src/pantheon/workspace/move-service.ts`
- `src/pantheon/factory/provision-client.ts`

(Names are suggestions; align to existing repo patterns when implementing.)

## Test Strategy

### Unit tests

- state transitions valid/invalid
- idempotency behavior by `operation_id`
- stale generation rejection
- config merge for a single agent entry

### Integration tests

- create -> active happy path
- deactivate -> inactive happy path
- activate from inactive happy path
- runtime config write failure
- gateway reload failure

### Chaos/retry tests

- duplicate delivery
- out-of-order delivery
- transient worker crash/restart mid-operation

## Go/No-Go Checklist

- Contract matrix signed off.
- Event schema version pinned.
- DB migrations applied in staging.
- Rollback plan validated.
- Operational dashboards and alerts available.
