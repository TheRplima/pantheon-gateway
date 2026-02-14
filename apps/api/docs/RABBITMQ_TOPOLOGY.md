# RabbitMQ Topology — Messaging & Infrastructure Contract

## Classification / Risk
**Classification**: HIGH RISK
**Status**: NORMATIVE / AUTHORITATIVE
**Authority**: Pantheon Control Plane (API)

Modifications to this document REQUIRE a formal Architectural Decision Record (ADR) and mandatory human review.

## Purpose
This document defines the authoritative RabbitMQ topology and messaging contract as enforced by the Pantheon ecosystem. It ensures that all producers and consumers operate within a deterministic, governed communication framework.

## Normative Scope and Authority
This contract is strictly derived from the following authoritative standards:
- `core/docs/standards/v3.1/MESSAGE_CONTRACT.md`
- `core/docs/standards/v3.1/IATP_LIQUID_STATE.md`
- `docs/architecture/ADR/adr-007-rabbitmq-iatp-v3.1.md`

Every element declared herein is either explicitly defined in or directly derivable from these documents. Elements not defined in the standards are explicitly marked as such.

## Alignment with IATP v3.1 and ADR-007
The topology serves as the transport layer for the Inter-Agent Task Protocol (IATP) v3.1 (Liquid State). It facilitates the transmission of wake-up signals from the Control Plane to agents, following the topic-based routing model and JSON payload schema defined in the core standards.

## Defined Messaging Entities

### Virtual Host
*   **Name**: `pantheon`
*   **Requirement**: All entities and connections MUST exist within this virtual host.
*   **Authority**: `IATP_LIQUID_STATE.md`

### Exchanges
| Name | Type | Durability | Purpose |
| :--- | :--- | :--- | :--- |
| `pantheon.iatp` | `topic` | Durable | Transport of IATP v3.1 signals (Wake-up). |
| **Authority** | `MESSAGE_CONTRACT.md`, `ADR-007` | | |

### Queues
*   **Specific Queue Names**: **Not specified in IATP v3.1.**
*   **Durable**: **Required** (per `MESSAGE_CONTRACT.md`).
*   **Auto-Delete**: **Not specified in IATP v3.1.**
*   **Deduplication/Idempotency**: Deduplication is required and relies on message_id as defined in MESSAGE_CONTRACT.md.

## Routing Keys and Patterns
| Source Exchange | Routing Key Pattern | Purpose |
| :--- | :--- | :--- |
| `pantheon.iatp` | `agent.<agent_id>.wakeup` | Targeting a specific agent for task processing. |
| **Authority** | `MESSAGE_CONTRACT.md`, `ADR-007` | |

## Undefined / Out-of-Scope Elements
The following elements are **NOT specified** in the IATP v3.1 (Liquid State) core documentation:
*   **Dead-Lettering (DLX/DLQ)**: Naming conventions and binding rules for dead-lettering are not defined.
*   **Retry Model**: The protocol does not define a retry strategy. Assumptions regarding automated retries are forbidden.
*   **Catch-all Queues**: Global monitoring or "tasks_wake_up" queues are not part of the normative IATP v3.1 topology.
*   **QoS / Prefetch**: Consumer-specific settings are out-of-scope for this contract.

## Required Message Properties
Producers MUST populate and consumers MUST validate the following properties from `MESSAGE_CONTRACT.md`:

| Field | Description | Constraint |
| :--- | :--- | :--- |
| `message_id` | Unique UUID-v4 for idempotency. | **Required** |
| `correlation_id` | UUID-v4 linking events across boundaries. | **Required** |
| `timestamp` | ISO-8601 publication time (UTC). | **Required** |
| `sender_id` | Identification of the publishing service. | **Required** |
| `action` | Command type (e.g., `WAKE_UP`). | **Required** |
| `payload` | Must contain `task_id`, `priority`, and `requires_attention`. | **Required** |
| `trace_chain` | Array of service IDs for observability. | Optional |

## Prohibited Assumptions
*   **Shadow Exchanges**: Agents MUST NOT create or use exchanges outside the `pantheon.iatp` hierarchy for governed tasks.
*   **Reliability Inversion**: Messaging is a signal, NOT the source of truth for state. State truth resides exclusively in the Control Plane database.
*   **Implicit Retries**: Consumers MUST NOT assume that re-queuing a message will automatically trigger a valid retry without Control Plane authorization.

## Governance Enforcement
The Control Plane (API) acts as the sovereign gate. Messages that violate the `MESSAGE_CONTRACT.md` schema or are published via unauthorized routing paths are considered governance breaches and MUST be ignored or logged for audit.

## Final Invariant
**The Contract is Absolute.** No messaging behavior or infrastructure configuration shall override the standards defined in IATP v3.1. In the event of discrepancy between local agent behavior and this document, this contract prevails.
