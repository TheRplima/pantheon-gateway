# INTER_AGENT_TASK_PROTOCOL.md (IATP v2.5 SOVEREIGN)

<!-- :::meta
template_version: v2.5
marker_schema: v1.0
::: -->

This document is the sovereign source of truth for the Pantheon v2.5 ecosystem. All inter-agent interaction is governed by the technical rules established herein.

## 1. The Task Container (`task_[ID]`)

Every task operates within an atomic folder. Physical possession of the folder defines the operational "turn", but not the execution authority.

### Canonical Structure
- `00_brief.md`: Objective definition (Mandatory for Requester).
- `10_plan.md`: Execution strategy (Mandatory for Executor).
- `20_execution/`: Subsystem for drafts and technical evidence.
- `30_report.md`: Structured final delivery (Mandatory for `done`).
- `STATE.json`: Task metadata and semantic state.
- `LOCKS/`: Technical locking subsystem.
- `SIGNATURES/`: Verifiable authorization subsystem.

## 2. The STATE.json Schema

The `STATE.json` file is the internal source of truth regarding semantic progress. Any state or transition outside this schema invalidates the task.

### Mandatory Fields
- `task_id`: UUID or unique task ID.
- `current_state`: Current state from the list below.
- `requester_agent`: ID of the requesting agent (where the task should return).
- `owner_agent`: ID of the agent with current possession.
- `created_at`: ISO8601 timestamp of creation.
- `last_transition_at`: ISO8601 timestamp of the last state change.
- `requires_plan_approval`: Boolean (Determined in Brief).
- `requires_exec_approval`: Boolean (Determined in Brief).

### Valid and Terminal States
- **In Progress**: `received`, `planning`, `plan_pending_approval`, `ready_for_execution`, `executing`, `exec_pending_approval`, `delivering`.
- **Terminal**: `done` (Success), `failed` (Technical error), `cancelled` (Aborted).

## 3. Technical Enforcement Protocol (Locks & Signs)

Pantheon governance is technical, not moral.

1. **Possession != Permission**: Having the folder in `active/` does not authorize destructive actions without corresponding signatures.
2. **LOCKS System**: The presence of `.required` in `LOCKS/` blocks state advancement and tools classified as critical.
3. **Signature Mandate**: Signatures in `SIGNATURES/*.sig` must be injected exclusively by the Orchestrator after artifact validation.
4. **Gate Failure**: Destructive tools MUST fail technically if a valid signature is not present.

## 4. Workflow and Transitions

### Step 1: Formalization (Requester -> Orchestrator)
1. Creates `task_[ID]` with `00_brief.md` and `STATE.json` (`received`).
2. Moves to Orchestrator's `inbox` and executes `iatp-notify`.

### Step 2: Orchestration (Orchestrator -> Executor)
1. Orchestrator validates the Brief and injects required `LOCKS/*.required`.
2. Identifies the Specialist and moves it to their `inbox`.

### Step 3: Execution and Substance Mandate
1. **Planning**: Agent moves to `active/` and generates `10_plan.md`.
2. **Approval**: If `requires_plan_approval`, moves to `outbox` and waits for `plan.approved.sig`.
3. **Execution**: With the signature, executes in `20_execution/` and generates `30_report.md`.
4. **Finalization**: Updates `STATE.json` to `delivering` and moves to `outbox`.

## 5. Exception Management (Failures and Aborts)

1. **Technical Failure**: If the Agent encounters an insurmountable error, it must update `current_state` to `failed`, attach the error log, and move to `outbox`.
2. **Cancellation**: Only the Orchestrator has the authority to mark a task as `cancelled`.
3. **Timeout**: Tasks stuck in `active/` for more than 24 hours without a `STATE.json` update are considered "zombies" and must be collected by the Orchestrator for audit.
4. **Final Authority**: The Orchestrator is the only agent capable of forcing task closure (`cancelled`/`failed`) within the Hub filesystem.

## 6. Artifact Validation

- **Without `10_plan.md`**, the task CANNOT advance to `executing`.
- **Without `30_report.md`**, the `done` state is invalid, and the Orchestrator must refuse collection.
- Every critical transition MUST be recorded in `STATE.json` or the container will be invalidated.
