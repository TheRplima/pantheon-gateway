# Pantheon Cutover Formalization (2026-02-14)

## Status

- Cutover MVP completed on **2026-02-14**.
- Source of truth for Pantheon API/contracts/docs is now this repository (`pantheon-gateway`).

## Authoritative Scope

From this date forward, the authoritative locations are:

- API: `apps/api`
- Event contracts: `packages/contracts/schemas/v1`
- Lifecycle and operations docs: `docs/pantheon/*`

## Legacy Repository Policy

Legacy repository (`~/projects/pantheon/api`) is now **historical reference only** for Pantheon domain changes.

Rules:

1. No feature evolution for Pantheon API/contracts/docs in legacy repo.
2. Only emergency forensic reads are allowed.
3. Any new Pantheon change must be implemented and reviewed in this repository.

## Branching Decision During Cutover

Initial plan mentioned branch `cutover/pantheon-api-import`.
Execution was completed directly on `development` with traceable commits and review evidence.
This is now the recorded operational decision.

## D5 Exit Evidence

- D1-D4 checklist items are complete in `docs/pantheon/cutover-execution-checklist.md`.
- D4 smoke command exists and passes locally:
  - `pnpm test:e2e:pantheon:create`
- Operation tracking and callback flow are active:
  - `POST /api/v1/agents`
  - `POST /api/v1/internal/agent-lifecycle/callback`
  - `GET /api/v1/agent-operations/{operation_id}`

## Announcement Template

Pantheon cutover concluído em 2026-02-14.
A partir desta data, este repositório é a única fonte autorizada para mudanças de API, contratos e documentação Pantheon.
O repositório legado permanece apenas como referência histórica.
