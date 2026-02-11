<!-- :::meta
template_version: v2.5
marker_schema: v1.0
::: -->


# FAILURE_MODES.md - Graceful Degradation

> [!NOTE]
> This file defines how the agent should behave when the task pipeline or infrastructure fails.
> In v2.5, **Protocol Integrity** is paramount over speed.

## 1. Task Container & Pipeline Failures

### Integrity Breach (Invalid Signature)
**Symptom:** A signature in `SIGNATURES/` exists but fails internal hash validation or task_id check.
**Response:** 
- **IMMEDIATE HALT**. Do NOT execute any tool.
- Log "INTEGRITY_BREACH" in `logs/decision_log.md`.
- Move container to `tasks/cancelled/` with a `FAILURE_REPORT.md`.
- Notify Orchestrator of suspected protocol tampering.

### Semantic Dissonance (State vs. Fact)
**Symptom:** `STATE.json` claims a state (e.g. `delivering`) but mandatory artifacts (e.g. `30_report.md`) are missing.
**Response:**
- Attempt to re-sync state by inspecting file prefixes (`00_`, `10_`).
- If reconciliation fails, revert `current_state` to `failed`.
- Request manual hub audit.

### Deadlock (Stalled Locks)
**Symptom:** Task is in `active/`, a `.required` lock is present, but no `.sig` is provided by the Orchestrator after repeated notifications.
**Response:**
- Move task to `tasks/waiting/`.
- Log "PROTOCOL_TIMEOUT" in `logs/decision_log.md`.
- Inform User (if ENTRY) or Orchestrator (if SERVICE) of the block.

## 2. Infrastructure & Role-Based Degradation

:::role:ENTRY
**Hub Disconnection:**
- Continue providing helpful chat but clearly state: "Offline: Unable to commit permanent changes".
- Queue any task creation requests; do NOT promise execution until reconnection.
:::

:::role:SERVICE
**Hub Disconnection:**
- Enter **Standby Mode**. Stop all background processing.
- Do NOT move folders between directories (prevents race conditions).
- Await Heartbeat restoration.
:::

:::role:ORCHESTRATOR
**Agent Unreachable:**
- If an agent fails to respond to `iatp-notify`, check Heartbeat status.
- If health check fails, do NOT move new tasks to that agent's `inbox`.
- Re-route critical tasks if a redundant agent is available.
:::

## 3. Behavioral Recovery

### Hallucinated Persistence (Ghosting)
**Symptom:** Agent claimed success in chat but failed to commit the file or tool call.
**Response:** Immediately acknowledge the failure, re-execute the missed action, and log the incident.

### Technical Leakage (Fourth Wall)
**Symptom:** Internal paths or jargon (Brief, Signature, IATP) leaked to human user.
**Response:** Apologize for "technical noise", rephrase in human terms, and re-read the **Privacy of the Hub** clause in `CORE_GOVERNANCE.md`.

## 4. Recovery Priority Hierarchy

1. **Protocol Sovereignty** — Prefer a failed task over a compromised protocol.
2. **Data Integrity** — Never guess the state; if `STATE.json` is corrupt, halt.
3. **Safety Transparency** — Tell the user/orchestrator exactly why you are stopping.
4. **Minimal Action** — When in doubt, enter "Read-Only" mode.

---

*Update this file when new failure scenarios are identified in production.*

---

*Extend this file with domain-specific failure modes.*
