# Pantheon Contract Matrix (Async Lifecycle)

## Scope

Operational contract for asynchronous lifecycle orchestration between workers, based on RabbitMQ events.

Related docs:

- `docs/pantheon/agent-lifecycle-async.md`
- `docs/pantheon/agent-queue-payload-schemas.md`
- `docs/pantheon/agent-schema-postgresql.sql`

## Global Rules

- Identity keys:
  - `agent_id` (UUID)
  - `user_id` (UUID)
- Workspace paths:
  - Active: `/home/node/workspaces/{user_id}/{agent_id}`
  - Disabled: `/home/node/workspaces/{user_id}/disabled/{agent_id}`
- Ordering/idempotency:
  - Lock key: `agent:{agent_id}`
  - Idempotency key: `operation_id`
  - Stale protection: ignore event if `generation < agents.generation`

## Event Matrix

| Event | Producer | Consumer | Preconditions | DB transition | Side effects | Next event |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `agent.provision.requested` | API worker | Factory worker | Agent exists, `desired_generation` set | `pending -> provisioning` | render workspace from template+model | `agent.workspace.ready` or `agent.failed` |
| `agent.workspace.ready` | Factory worker | API worker | workspace exists + checks pass | `provisioning -> workspace_ready` | persist render metadata/checksums | `agent.runtime.register.requested` |
| `agent.runtime.register.requested` | API worker | Runtime worker | workspace path resolved | `workspace_ready -> registering` | atomic update of `runtime/config/openclaw.json` (`agents.list`, optional bindings) | `agent.runtime.registered` or `agent.failed` |
| `agent.runtime.registered` | Runtime worker | API worker | config persisted | `registering -> registered` | persist runtime revision | `agent.activation.requested` (if desired active) |
| `agent.activation.requested` | API worker | Runtime/Workspace worker | desired state `active` | `registered|inactive -> activating` | move disabled->active if needed, reload/debounce gateway | `agent.activated` or `agent.failed` |
| `agent.activated` | Runtime worker | API worker | healthcheck OK | `activating -> active` | set `current_workspace_path=active`, `runtime_registered=true` | terminal |
| `agent.deactivation.requested` | API worker | Runtime/Workspace worker | agent currently active or registered | `active|registered -> deactivating` | remove routing/registration, drain, move active->disabled | `agent.deactivated` or `agent.failed` |
| `agent.deactivated` | Runtime/Workspace worker | API worker | workspace moved | `deactivating -> inactive` | set `current_workspace_path=disabled`, `runtime_registered=false` | terminal |
| `agent.failed` | Any worker | API worker | failure occurred | `* -> error` | store `failed_step`, `error_code`, `error_message`, `retry_count` | optional retry event |

## Worker Responsibilities

### API Worker

- Owns lifecycle truth in DB (`agents`, `agent_operations`, `agent_lifecycle_events`).
- Publishes command/intention events.
- Consumes result events and applies transitions.
- Rejects stale generation events.

### Factory Worker

- Consumes only provisioning events.
- Executes `agent-factory` generation using template/model snapshot.
- Emits render results (created/skipped/protected files, checksums, manifest applied).

### Runtime Worker

- Owns runtime registration/unregistration and gateway reload orchestration.
- Performs atomic config writes.
- Validates runtime health before success event.

### Workspace Move Worker

- Executes activate/deactivate path moves.
- Enforces single current location invariant.

## State Transition Guards

### Activation guards

- `desired_state = active`
- `generation == desired_generation`
- workspace present at active path after move
- runtime registration present

### Deactivation guards

- no in-flight hard-blocking executions (or force policy enabled)
- routing removed before workspace move
- workspace present at disabled path after move

### Failure guards

- always persist structured error
- never publish success after failure for same `operation_id`

## Idempotency Matrix

| Condition | Expected behavior |
| :--- | :--- |
| Duplicate `operation_id` | Ignore side effects, return stored result/status |
| Duplicate event with new `operation_id` but stale `generation` | Mark `ignored_stale` in `agent_operations` |
| Out-of-order success event | Reject if current state does not allow transition |
| Retry after transient failure | Reuse same semantic operation with new `operation_id`, increment retry count |

## Config Update Contract (`runtime/config/openclaw.json`)

- Read current file.
- Validate JSON parse.
- Apply merge for one `agent_id` only.
- Write temp file in same dir.
- `fsync` temp file.
- Atomic rename temp -> target.
- Optional backup retention for rollback.

## Gateway Reload Contract

- Debounce window: configurable (suggest 2-10 seconds).
- Batch all pending register/unregister operations during window.
- Healthcheck after reload before publishing success.
- On healthcheck fail:
  - emit `agent.failed`
  - keep state in `error`

## Minimal Observability

- Metrics:
  - transition latency per step
  - failure rate per event type
  - retries and DLQ count
- Logs (structured):
  - `agent_id`, `user_id`, `operation_id`, `generation`, `event_name`, `state_before`, `state_after`

## Acceptance Checklist

- All lifecycle events are mapped to exactly one owning consumer.
- All success events have corresponding state guard.
- All side effects are idempotent.
- Activate/deactivate always enforce workspace path invariants.
- Runtime config updates are atomic and recoverable.
