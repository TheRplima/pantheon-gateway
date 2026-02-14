# Pantheon Operations Runbook (Async Agent Lifecycle)

## Purpose

Operational procedures for monitoring and recovering the asynchronous agent lifecycle pipeline.

Related:

- `docs/pantheon/contract-matrix.md`
- `docs/pantheon/agent-lifecycle-async.md`
- `docs/pantheon/agent-queue-payload-schemas.md`

## Operational Signals

Track at minimum:

- Queue depth per queue (`q.agent.factory`, `q.agent.runtime`, `q.agent.workspace.move`, `q.agent.api.callback`, `q.agent.dlq`).
- Error rate by event type.
- Transition latency by step.
- DLQ inflow rate.

Required correlation fields in logs:

- `agent_id`, `user_id`, `operation_id`, `generation`, `event_name`, `from_state`, `to_state`.

For D4 MVP, at minimum every lifecycle log line must include:

- `operation_id`, `agent_id`, `event_name`, `generation`.

Current implementation emits these fields in:

- API callback logs: `pantheon.callback.applied`, `pantheon.callback.duplicate_event`, `pantheon.callback.stale_generation`.
- Gateway factory/callback consumers: `pantheon.lifecycle ... action=accepted|published|delivered|rejected`.

## D4 Smoke Command

Single-command local smoke (pass/fail):

```bash
pnpm test:e2e:pantheon:create
```

Environment variables (optional):

- `PANTHEON_SMOKE_API_BASE_URL` (default: `http://127.0.0.1:9504`)
- `PANTHEON_API_CALLBACK_TOKEN` (if callback auth is enabled)

Expected success output:

- Line containing `PASS operation_id=... agent_id=... state=ready event_name=agent.create.completed generation=1`

## Incident Classes

### P1: Pipeline stall

Symptoms:

- Queue depth rising with no consumer progress.
- Agents stuck in `provisioning`, `registering`, `activating`, or `deactivating`.

Actions:

1. Verify worker process health.
2. Verify RabbitMQ connection/auth and consumer bindings.
3. Run smoke to validate end-to-end path quickly:
   - `pnpm test:e2e:pantheon:create`
4. Reconcile stuck operations from `agent_operations` where `state='provisioning'` and `updated_at` older than threshold.
5. Requeue or fail operation deterministically.

### P1: Runtime config write failure

Symptoms:

- `agent.failed` with `failed_step=runtime_register` or `runtime_unregister`.

Actions:

1. Validate JSON integrity of `runtime/config/openclaw.json`.
2. Restore from latest valid backup (if configured).
3. Replay pending registration operation(s) with new `operation_id` and same `generation`.
4. Confirm API callback queue is draining (`q.agent.api.callback`) and callback consumer is enabled.

### P1: Gateway reload failure

Symptoms:

- Activation stuck; healthcheck fails after reload.

Actions:

1. Capture gateway logs around reload window.
2. Roll back runtime config to last known-good version.
3. Restart gateway once with known-good config.
4. Mark current operation failed and schedule retry.
5. Re-run `pnpm test:e2e:pantheon:create` before closing incident.

### P2: Workspace move failure

Symptoms:

- Activate/deactivate fails with path inconsistency.

Actions:

1. Check source and target path existence.
2. Verify no active lock/process still using source path.
3. Retry move under lock.
4. If partial move occurred, restore path invariant and emit `agent.failed` with details.

## DLQ Procedure

1. Consume DLQ message and parse root cause.
2. Categorize:
   - transient infra (network, lock timeout)
   - deterministic contract error (invalid payload/schema)
   - code defect
3. For transient infra:
   - republish with new `operation_id`
4. For deterministic contract errors:
   - fix producer contract first; do not replay unchanged payload
5. For code defects:
   - patch and replay controlled batch

## Retry Policy (default)

- Attempt 1 immediately.
- Attempts 2-5 with exponential backoff + jitter.
- After max retries, route to DLQ and set agent state `error`.

## Manual Recovery Commands (conceptual)

Use internal tooling/SQL equivalents:

- Find stuck operations by age/status.
- Mark operation `failed` with reason.
- Republish event from stored payload with new `operation_id`.
- Transition agent to safe `inactive` state when uncertain.

Useful API checks:

- `GET /api/v1/agent-operations/{operation_id}`
- `POST /api/v1/internal/agent-lifecycle/callback`

## Safe State Fallback

When consistency is uncertain:

1. Remove runtime routing/registration.
2. Ensure workspace is in disabled path.
3. Set `lifecycle_state='inactive'`, `desired_state='inactive'`.
4. Require explicit reactivation flow.

## Post-Incident Checklist

- Root cause recorded.
- Failed step taxonomy updated.
- Missing guardrails added (if needed).
- Alert threshold tuned.
- Runbook updated.
