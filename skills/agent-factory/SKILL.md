---
name: agent-factory
description: Create a Pantheon agent workspace following Sovereign Standard v2.5. Use when generating new agent workspaces with IATP v2.5 Task Container structure.
---

# Agent Factory v2.5 Sovereign

## Overview

Generate a new Pantheon-compliant agent workspace followinig the v2.5 Sovereign standard:
- **Hierarchical Governance**: CORE, DRIFT, FAILURE, and SECURITY policies.
- **Deterministic Decision Layer**: State-machine driven rules and gates.
- **IATP v2.5 Protocol**: Atomic Task Container flow (BRIEF/PLAN/EXEC/REPORT).
- **Stateless/Stateful Isolation**: Strict user context handling.
- **Sovereign English**: Guaranteed English system prompts for LLM alignment.

## Workflow

### 1) Choose or Create a Model
Select a YAML model from `models/entry/`, `models/service/`, or `models/orchestrator/`. 
Ensure all agent-facing content in the model is in **English**.

### 2) Run the Generator

```bash
# Example: Creating a new research service
python3 configs/skills/agent-factory/scripts/agent_factory.py \
  --name "researcher" \
  --model "muse" \
  --role "SERVICE" \
  --template_version "v2.5" \
  --base_dir "agents/services" \
  --register
```

### 3) Key Options

| Flag | Description |
|------|-------------|
| `--template_version` | Use `v2.5` for current Sovereign standard. |
| `--register` | Registers the agent in `configs/registry/`. |
| `--force` | Overwrites core files (use for migrations). |
| `--dry-run` | Preview files before writing to disk. |

## Workspace Structure (v2.5)

```
agents/<name>/
├── IDENTITY.md          # Systemic Identity Contract
├── SOUL.md              # Essence & Principles [PROTECTED]
├── USER.md              # Interaction Context (Stateless/Stateful)
├── AGENTS.md            # Local Registry View
├── TOOLS.md             # Available Tool definitions
├── BOOTSTRAP.md         # Onboarding instructions
├── HEARTBEAT.md         # Operational status
│
├── governance/
│   ├── CORE_GOVERNANCE.md      # Absolute laws
│   ├── SPECIFIC_GOVERNANCE.md  # Domain-specific rules [PROTECTED]
│   ├── DRIFT_RULES.md          # Performance/Identity monitoring
│   ├── FAILURE_MODES.md        # Fallback procedures
│   ├── SECURITY_POLICY.md      # Integrity & Secret handling
│   └── INTER_AGENT_TASK_PROTOCOL.md # IATP v2.5 Spec
│
├── decision/
│   ├── inputs.schema.yaml      # Task Container data validation
│   ├── gates.yaml              # Active security/logic blockers
│   └── rules.yaml              # Domain state machine
│
└── protocols/task_container/   # Recursive IATP execution
    ├── STATE.json
    ├── 00_brief.md
    ├── 10_plan.md
    └── 30_report.md
```

## Manifest System
V2.5 models can request extra artifacts via the `manifest` field. These are pulled from the `template/v2.5/` directory and injected into the agent's workspace root.

## Essence Protection
The factory preserves `SOUL.md` and `SPECIFIC_GOVERNANCE.md` unless `--force` is used, allowing for safe iterative updates to the system core without losing the agent's unique character.
