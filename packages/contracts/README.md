# Pantheon Contracts

Versioned async contracts for Pantheon services.

## Scope

- RabbitMQ event envelope schema.
- Versioned payload schemas (`v1`, `v2`, ...).
- Contract compatibility rules.

## Structure

- `schemas/v1/envelope.schema.json`
- `schemas/v1/agent.create.requested.schema.json`
- `schemas/v1/agent.create.completed.schema.json`
- `schemas/v1/agent.registered.schema.json`
- `schemas/v1/agent.activated.schema.json`
- `examples/v1/*.json`

## v1 Compatibility Rules

- Producers must send `event_version: 1`.
- Consumers must validate required fields before processing.
- Backward-incompatible changes require a new version directory (`v2`).
- New optional fields in `v1` are allowed as additive changes.

## Event Coverage (v1 phase 1)

- `agent.create.requested`
- `agent.create.completed`
- `agent.registered`
- `agent.activated`

## Notes

`agent_id` and `user_id` are UUIDs.
Workspace paths are carried as resolved values (not placeholders).
