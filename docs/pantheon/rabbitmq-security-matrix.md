# RabbitMQ Security Matrix (Lifecycle)

## Purpose

Define publish/consume permissions per worker role for lifecycle topics.

## Exchange

- `pantheon.agent.lifecycle` (topic)

## Queues and Routing Keys

- `agent.provision.requested`
- `agent.workspace.ready`
- `agent.runtime.register.requested`
- `agent.runtime.registered`
- `agent.activation.requested`
- `agent.activated`
- `agent.deactivation.requested`
- `agent.deactivated`
- `agent.failed`

## Worker Roles

- `api-worker`
- `factory-worker`
- `runtime-worker`
- `workspace-worker`
- `ops-observer` (read-only)

## ACL Matrix

| Role | Publish | Consume |
| :--- | :--- | :--- |
| `api-worker` | `agent.provision.requested`, `agent.runtime.register.requested`, `agent.activation.requested`, `agent.deactivation.requested` | `agent.workspace.ready`, `agent.runtime.registered`, `agent.activated`, `agent.deactivated`, `agent.failed` |
| `factory-worker` | `agent.workspace.ready`, `agent.failed` | `agent.provision.requested` |
| `runtime-worker` | `agent.runtime.registered`, `agent.activated`, `agent.failed` | `agent.runtime.register.requested`, `agent.activation.requested`, `agent.deactivation.requested` |
| `workspace-worker` | `agent.deactivated`, `agent.activated`, `agent.failed` | `agent.activation.requested`, `agent.deactivation.requested` |
| `ops-observer` | none | all lifecycle events (optional mirrored queue) |

## Security Controls

- Separate RabbitMQ credentials per worker role.
- Virtual host dedicated to lifecycle traffic.
- TLS required for all connections.
- Publisher confirms enabled.
- Message TTL + dead-letter policy configured.
- Queue bindings immutable via IaC.

## Authorization Validation Inside Payload

Consumers must validate:

- `agent_id` format (UUID)
- `user_id` ownership against DB (`agents.user_id`)
- `generation` not stale
- `operation_id` idempotency

## Audit

- Log denied publish/consume attempts.
- Alert on unauthorized routing key access.
- Periodic ACL review per environment.
