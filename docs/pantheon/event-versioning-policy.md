# Pantheon Event Versioning Policy

## Purpose

Define compatibility rules for RabbitMQ lifecycle events.

## Version Field

Every event must include:

- `event_name`
- `event_version` (integer, starts at `1`)

## Compatibility Rules

### Non-breaking changes (same major version)

Allowed without changing consumer contract behavior:

- Add optional fields.
- Add optional nested objects.
- Add new enum values only if consumers are tolerant.

### Breaking changes (new version)

Require new `event_version` and coordinated rollout:

- Remove required field.
- Change field type.
- Tighten enum/value constraints.
- Change event semantics/order.

## Producer Rules

- Producers must emit exactly one schema version per event type.
- During migration, producers may dual-publish old/new versions only for controlled transition windows.

## Consumer Rules

- Consumers must validate `event_name + event_version`.
- Unsupported versions must be rejected and routed to DLQ with explicit error code.
- Consumers should be forward-tolerant for unknown optional fields.

## Rollout Strategy

1. Add new consumer support first (read old+new).
2. Switch producer to new version.
3. Monitor for old-version traffic drain.
4. Remove old-version support after deprecation window.

## Deprecation Window

- Default deprecation window: 2 release cycles.
- Emergency shortening allowed only for security defects.

## Schema Governance

- Source of truth: `docs/pantheon/agent-queue-payload-schemas.md`.
- Any version bump requires:
  - schema update
  - examples update
  - contract matrix confirmation
  - changelog note in docs
