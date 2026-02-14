# Task Lifecycle — Control Plane Authority

## Classification / Risk
**Classification**: HIGH RISK
**Status**: NORMATIVE / AUTHORITATIVE
**Authority**: Pantheon Control Plane (API)

Modifications to this document REQUIRE a formal Architectural Decision Record (ADR) and mandatory multi-party human review.

## Purpose
This document defines the macro-level lifecycle of a Task as enforced by the Pantheon Control Plane. It establishes the normative states and transitions that govern the existence and validity of work within the ecosystem. It is the primary reference for auditing system integrity and ensuring governance compliance.

## Alignment with IATP v3.1 (Liquid State)
This lifecycle is strictly bound to the **Liquid State** model. A task's state is not a local property of an agent; it is a persistent database record managed by the API Gateway. All state changes must be transacted through the Control Plane and are reconstructible from the centralized database, message events, and immutable audit logs.

## Task Definition (Control Plane perspective)
At the Control Plane level, a **Task** represents a bounded set of architectural or operational commitments.
*   **Persistent**: It exists as a unique UUID in the authoritative `tasks` schema.
*   **Governed**: Its standing in the system is determined by its `current_state`.
*   **Atomic**: A task transition represents a change in governance standing, not a progress update.
*   **Role-Based Interaction**: The terms **Requester Agent** and **Owner Agent** define logical interaction roles within a specific task context. These roles do NOT imply inherent authority or ownership over the task's state; all state authority remains exclusively with the Control Plane.

## Authoritative Task States
The Control Plane recognizes only the following macro-level states. Each state represents a specific governance posture and set of allowed actions.

| State | Governance Standing |
| :--- | :--- |
| `received` | Initial registration. Task identity established. No work authorized. |
| `plan_pending_approval` | Validation Gate 1. Technical plan submitted; awaiting verification. |
| `ready_for_execution` | Execution Authorized. The objective is cleared for implementation. |
| `exec_pending_approval` | Validation Gate 2. Execution complete; results awaiting verification. |
| `done` | Task Finality (Success). Objectives met; artifacts stabilized. |
| `failed` | Task Finality (Abort). Terminated due to error or governance breach. |
| `cancelled` | Task Finality (Administrative). Terminated by authorized actor. |

> [!IMPORTANT]
> **Macro-Level Only**: This lifecycle excludes execution-internal phases (e.g., planning, executing, delivering). Such phases are protocol-level telemetry and do NOT constitute changes in the task's governance standing.

## Allowed State Transitions
Transitions are strictly unidirectional and enforced by the Control Plane API.

1.  **Request**: `received` → `plan_pending_approval` (Triggered by Owner Agent submitting a plan)
2.  **Authorize**: `plan_pending_approval` → `ready_for_execution` (Triggered by Human/Governance approval)
3.  **Verify**: `ready_for_execution` → `exec_pending_approval` (Triggered by Owner Agent submitting results)
4.  **Conclude**: `exec_pending_approval` → `done` (Triggered by Final Sign-off)

**Exceptional Transitions**:
*   Any non-terminal state → `failed` (Error/Breach discovery)
*   Any non-terminal state → `cancelled` (Administrative override)

## State Ownership & Authority
*   **Requester Agent Role**: Authorized to initialize a task (`received`) and request `cancellation`.
*   **Owner Agent Role**: Authorized to request gate transitions (`plan_pending_approval`, `exec_pending_approval`) by submitting evidence.
*   **Control Plane (API)**: Sole authority to record state changes and enforce transition logic.
*   **Human Authority**: Clear identification of human accountability is required for all transitions from `pending_approval` states. Final authority rests with a Human Administrator or a designated Human-in-the-loop process as defined in `GOVERNANCE.md`.

## Evidence & Audit Requirements
A state transition is invalid without corresponding evidence persisted in the Control Plane. References to schema elements (e.g., `task_contents`, `task_signatures`) reflect the current IATP v3.1 implementation; however, the lifecycle semantics defined here remain authoritative even if storage representations evolve.

*   **Plan Gate**: Entry to `plan_pending_approval` requires a compliant `plan` content record.
*   **Execution Gate**: Entry to `exec_pending_approval` requires a compliant `report` (summary of results) record.
*   **Finality**: Entry to `done` requires all mandatory cryptographic signatures recorded and verified.

## Failure Semantics
A task MUST transition to `failed` if:
*   The system detects a protocol or security violation.
*   Execution evidence is found to be fraudulent or incomplete.
*   Technical failure prevents objective completion.
Transitions to `failed` are irreversible.

## Cancellation Rules
Cancellation is an administrative action. It signifies that the task is no longer required or has been superseded. Unlike `failed`, `cancelled` does not necessarily imply an error, but it does terminate the task's standing.

## Prohibited Behaviors
*   **Shadow States**: Agents must not act as if a task is in a state not reflected in the Control Plane database.
*   **Skip-Transitions**: Bypassing the `plan_pending_approval` gate for critical tasks is a governance violation.
*   **Local Finality**: An agent asserting a task is `done` without Control Plane confirmation is ignored.
*   **Retroactive State Editing**: Historical state records are immutable.

## Governance Enforcement
The Control Plane acts as a **Sovereign Gate**. It rejects any request that violates the transition path or fails to provide the required evidence. Violations result in immediate session logging and potential revocation of agent authority.

## Final Invariant
**The Database is the Truth.** No task shall exist outside the authoritative database of the Control Plane. In the event of discrepancy between messaging states, agent memory, or filesystem artifacts, the Control Plane database record is the only valid state.
