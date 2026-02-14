# Database Invariants — Control Plane Governance

## 1. Classification & Authority
**Classification**: HIGH RISK
**Status**: NORMATIVE / AUTHORITATIVE
**Authority**: Pantheon Control Plane (API)

Modifications to this document REQUIRE a formal Architectural Decision Record (ADR) and mandatory multi-party human review. This document defines the binary, non-negotiable invariants enforced by the Pantheon database.

## 2. Purpose of Database Invariants
The database is the sovereign source of truth for task existence, ownership, and lifecycle validity. These invariants serve as the final arbiter of governance, ensuring that system state is auditable, consistent, and secure. Any state, transition, or relation not represented in the database is invalid by definition and MUST be rejected at the storage layer.

## 3. Invariant Categories
The invariants are grouped into specific domains of governance:
*   Task Identity & Reference Integrity
*   Lifecycle State Consistency
*   Ownership & Delegation Authority
*   Immutability & Audit Traceability
*   State vs. Signal Decoupling

## 4. Task Identity Invariants
*   **Unique Identity**: Every Task MUST have a globally unique UUID-v4. The database MUST NOT allow the creation of a task without a verified UUID.
*   **Immutable Identity**: The Task ID (`id`) is immutable and MUST NOT be updated after the initial commit.
*   **Reference Integrity**: All agent references (`requester_agent`, `owner_agent`) MUST resolve to an active entry in the `agents` registry. The database MUST reject task creation or updates referencing non-existent or inactive agents.
*   **Existence Bond**: A Task record MUST NOT exist without a defined Requester and an assigned Owner.

## 5. Task Lifecycle Invariants
*   **Sovereign State**: The `current_state` field is the sole arbiter of a task's governance standing. Any local agent state not synchronized with the database is consider non-authoritative.
*   **Strict Domain**: The database MUST REJECT any `current_state` value that does not exist in the `task_state` ENUM defined in `SQL_SCHEMA.sql`.
*   **Mutation Authority**: Nexus is the sole authority allowed to initiate mutations of task state. The database MUST reject any state update not authorized by the Nexus orchestrator.
*   **Atomic History**: Every mutation of `current_state` MUST be accompanied by an atomic, transitive insert into the `task_history` table. The transition MUST NOT be committed if the history record fails.
*   **Terminal Lockdown**: Once a task enters a terminal state (`done`, `failed`, `cancelled`), the database MUST REJECT any further state mutations.

## 6. Ownership & Delegation Invariants
*   **Registry Dependency**: A task MUST NOT be assigned to or requested by an actor not currently registered in the `agents` table.
*   **Nexus Exclusivity**: Nexus maintains exclusive control over task delegation records. No mutation of task ownership or delegation metadata is valid without explicit Nexus authorization.
*   **Dependency Integrity**: Every `parent_task_id` MUST reference an existing task. The database MUST REJECT the creation of circular task hierarchies.

## 7. Immutability & Audit Invariants
*   **Temporal Stability**: The `created_at` timestamp in governance tables (`tasks`, `task_history`, `task_contents`, `task_signatures`) is a permanent record. The database MUST NOT allow updates or deletions of these timestamps.
*   **Traceability Preservation**: The `task_history` and `execution_logs` tables are append-only. Mutation or deletion of existing records is strictly prohibited and MUST be prevented at the storage layer.
*   **Versioning Compulsion**: Updates to task content bodies MUST increment the version and preserve all previous versions in `task_contents`. The database MUST NOT allow overwriting of existing content versions.
*   **Proof Permanence**: Cryptographic signatures in `task_signatures` MUST NOT be modified or deleted. They constitute immutable proof of approval.

## 8. Messaging vs State Authority
*   **Zero Signal Authority**: RabbitMQ signals (WAKE_UP messages) carry zero authority over task state. A message exists only as a request for action; it does not change the task's standing until the database is updated.
*   **Signal Pre-condition**: An execution signal MUST NOT be generated for a task unless its record in the database is in a state that permits execution (e.g., `ready_for_execution`).
*   **Conflict Resolution**: In the event of discrepancy between a message payload and the database `current_state`, the database value prevails absolutely.

## 9. Prohibited States & Transitions
The database MUST REJECT any operation that attempts to create the following conditions:
*   **Gate Bypass**: Reaching `ready_for_execution` without a transition record from `plan_pending_approval` for tasks where `requires_plan_approval` is TRUE.
*   **Evidence Gap**: Entering the `done` state without a corresponding entry in `task_contents` of type `report`.
*   **Validation Breach**: Entering the `done` state while `task_validators` for the `exec` scope remain unsatisfied.
*   **Ghost Ownership**: Active tasks where the `owner_agent` has been marked as inactive in the registry.

## 10. Governance Enforcement
*   **Binary Rejection**: The Control Plane MUST REJECT any transaction that violates these invariants. This is not a preference; it is a hard integrity constraint.
*   **Breach Audit**: Any transaction failure resulting from an invariant violation MUST be logged for mandatory governance audit.
*   **State Integrity Checks**: The system MUST perform automated, continuous reconciliation to ensure that `current_state` matches the log of transitions in `task_history`.

## 11. Change Control (Normative)
This document is a formal specification of the system's security and integrity boundaries. Any modification requires a high-risk classification, a formal ADR, and explicit human validation before being committed to the repository.
