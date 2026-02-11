# Agent Factory — Pantheon v2.5 Sovereign

Production-ready agent workspace generator for the Pantheon ecosystem. Standardized for maximum logical alignment and sovereignty.

## Quick Start

```bash
# Generate ENTRY agent from model
python3 scripts/agent_factory.py \
  --name my-agent \
  --model pantheon-operator \
  --role ENTRY \
  --base_dir agents

# Generate SERVICE agent from model (Default role is SERVICE)
python3 scripts/agent_factory.py \
  --name my-service \
  --model docsmith \
  --template_version v2.5 \
  --base_dir agents
```

## Usage

```
agent_factory.py --name NAME --model MODEL --role {ENTRY|SERVICE|ORCHESTRATOR} [options]
```

### Required Arguments
| Arg | Description |
|-----|-------------|
| `--name` | Agent name/ID (slugified for filesystem) |
| `--model` | Model name from `models/{type}/` |
| `--role` | Agent type: ENTRY, SERVICE, or ORCHESTRATOR |

### Optional Arguments
| Arg | Default | Description |
|-----|---------|-------------|
| `--base_dir` | `agents` | Output directory |
| `--template_version` | `v2.5` | Current Sovereign template version |
| `--force` | false | Overwrite existing files |
| `--register` | false | Create config.json in `configs/registry/` |
| `--dry-run` | false | Preview without creating |

### Legacy Arguments (backward compatibility)
`--function`, `--profile`, `--responsibilities` — usage deprecated in favor of model-driven generation.

## Directory Structure (v2.5)

```
agent-factory/
├── scripts/
│   └── agent_factory.py      # Main generator script
├── models/
│   ├── entry/                 # ENTRY agent models
│   ├── service/               # SERVICE agent models
│   └── orchestrator/          # L1 Orchestrator models
└── template/
    ├── v2.5/                  # Current Sovereign version
    │   ├── SOUL.md            # Essence & Principles
    │   ├── IDENTITY.md        # Identiy Contract
    │   ├── USER.md            # Interaction Context
    │   ├── AGENTS.md          # Registry View
    │   ├── governance/        # CORE, DRIFT, FAILURE, SECURITY
    │   ├── decision/          # RULES, GATES, SCHEMA
    │   └── protocols/         # IATP Task Container (v2.5)
    └── archive/               # Legacy templates (v2.3, v2.2)
```

## Sovereign Principles

### 1. Sovereign English Requirement
All agent-facing content (SOUL, IDENTITY, GOVERNANCE, DECISION) MUST be in **English**. This ensures maximum semantic compatibility with LLMs and follows the project's internal technical standard (Decision #32).

### 2. Essence Shielding
The factory protects the "soul" of an agent. By default, it will NEVER overwrite:
- `SOUL.md` (Agent essence/principles)
- `governance/SPECIFIC_GOVERNANCE.md` (Specific domain rules)

To force an update (migration), use the `--force` flag.

## Model Schema (v2.5)

V2.5 models support dynamic artifact injection via the `manifest`:

```yaml
schema_version: "2.5"
model_version: "1.0.0"
compatible_template: "v2.5"
name: agent-name
type: SERVICE
domain: domain-name

# ... Identity and Soul blocks ...

decision:
  proactivity:
    enabled: false
  
  # Optional: Extra artifacts to inject from templates
  manifest:
    - "protocols/specialized/custom_protocol.md"
```

## Governance Compliance

All generated agents MUST comply with Pantheon Sovereign v2.5:

- **ENTRY agents**: Zero execution authority. Always delegate via Nexus.
- **SERVICE agents**: Headless, stateless, Nexus-only invocation.
- **IATP v2.5**: Mandatory Task Container flow (BRIEF -> PLAN -> EXECUTION -> REPORT).

## Migration (v2.3 -> v2.5)

1. Backup any `:::extensible` customization.
2. Run factory with `--template_version v2.5 --force`.
3. Verify the newly generated `governance/SECURITY_POLICY.md` and `governance/DRIFT_RULES.md`.
4. Ensure all agent-facing fields are translated to English.
