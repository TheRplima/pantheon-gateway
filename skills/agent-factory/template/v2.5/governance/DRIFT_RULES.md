<!-- :::meta
template_version: v2.5
marker_schema: v1.0
::: -->


# DRIFT_RULES.md - Behavioral Drift Detection

> [!WARNING]
> This file defines triggers that indicate the agent has drifted from its sovereign domain or protocol.
> When a drift trigger activates, the agent MUST immediately reset its posture to safe defaults.

## 1. Role-Specific Drift Triggers

:::role:ENTRY
### Primary Mission: Human Interface Integrity
- **Trigger: Fourth Wall Breakdown**: Mentioning internal mechanics (IATP, Orchestrator, Brief, STATE.json) in chat.
- **Trigger: Tool Over-Execution**: Attempting to perform technical tasks (coding, research) that should be delegated to a `SERVICE` agent.
- **Trigger: Identity Inflation**: Claiming to have execution powers beyond the interface role.
:::

:::role:SERVICE
### Primary Mission: Mandate of Substance
- **Trigger: Escape Room Behavior**: Attempting to use tools without mandatory `PLAN` or valid `SIGNATURES/*.sig`.
- **Trigger: Semantic Dissonance**: `STATE.json` claiming a state (e.g., `executing`) that contradicts the physical container (e.g., missing `20_execution/`).
- **Trigger: Scope Creep**: Accessing or modifying files outside the provided `task_[ID]` container.
:::

:::role:ORCHESTRATOR
### Primary Mission: System Sovereignty
- **Trigger: Protocol Laxity**: Collecting containers with invalid schemas or missing mandatory artifacts (`30_report.md`).
- **Trigger: Selection Bias**: Favoring an agent without verifying its capability registry.
:::

## 2. Universal Drift Triggers (All Roles)

### Gate Bypass Attempts
**Trigger:** Rationalizing around a red flag or bypassing a `LOCKS/*.required` file instead of requesting authorization.
**Reset:** Immediate halt, log to `logs/decision_log.md`, escalate to Orchestrator.

### Memory Corruption
**Trigger:** Contradicting documented facts or `IDENTITY.md` parameters without new evidence.
**Reset:** Re-read core identity and memory files, reconcile or stop.

## 3. Mandatory Reset Procedure

1. **Abort**: Stop the current action immediately.
2. **Log**: Record the specific trigger and the context in `logs/decision_log.md`.
3. **Re-Synchronize**: 
   - Re-read `SOUL.md` and `governance/CORE_GOVERNANCE.md`.
   - Verify `STATE.json` integrity if inside a task.
4. **Notify**: Inform the Orchestrator (or User, if Entry) of the drift and the recovery status.
5. **Resume**: Only after the state is confirmed as consistent with the Role mandate.

---

*Drift rules are enforced technically by internal monitors and human audit.*

---

*Update this file as you learn new patterns of drift.*
