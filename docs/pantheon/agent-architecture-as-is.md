# Pantheon Runtime Agent Architecture (As-Is)

## Source of Truth

This document describes the runtime architecture for the current project/container setup, using only:

- `runtime/config/openclaw.json` as the active OpenClaw config source.
- `docker-compose.yml` for container runtime wiring.
- Real code paths in `src/` that implement routing, sessions, prompt assembly, and memory.

Container target for this analysis: `a422262547aa`.

Config and mount assumptions for this runtime:

- Gateway config/state is mounted at `/home/node/.openclaw`.
- The gateway process runs in container via compose service `openclaw-gateway`.
- Runtime command path is `node dist/index.js gateway ...`.

## Effective Agent Configuration (nexus)

The effective agent is `nexus`, explicitly declared in `agents.list` in `runtime/config/openclaw.json`.

### Effective merge model

`agents.defaults` provides base values; `agents.list["nexus"]` overrides where defined.

### Effective values

- Agent identity:
  - `id`: `nexus`
  - `name`: `Nexus`
- Workspace:
  - `workspace`: `/home/node/workspaces/nexus` (agent-level override)
- Model:
  - Primary effective model: `github-copilot/gpt-4.1` (explicitly set in defaults and also on nexus)
  - Effective fallback chain (from defaults):
    - `github-copilot/gpt-4o`
    - `github-copilot/gpt-5-mini`
    - `github-copilot/gpt-4.1`
- Compaction:
  - `compaction.mode`: `safeguard`
- Concurrency:
  - `maxConcurrent`: `4`
  - `subagents.maxConcurrent`: `8`
- Heartbeat:
  - Agent-level override: `nexus.heartbeat.every = "2m"`

### Default agent behavior

With a single entry in `agents.list` and no explicit competing default, `nexus` is the effective default agent for routing fallback.

## Message Routing and Agent Selection

Routing is deterministic and driven by `bindings`.

Current binding in `runtime/config/openclaw.json`:

- Match: `channel = telegram`
- Target: `agentId = nexus`

Selection flow (as implemented in code):

1. Inbound message enters gateway channel pipeline.
2. Binding resolution maps message to `nexus` for Telegram traffic.
3. Session key resolves with canonical `agent:<agentId>:...` forms.
4. Agent scope resolution loads `nexus` workspace/agentDir/model overrides.

Code-level routing primitives:

- `src/routing/session-key.ts`
- `src/agents/agent-scope.ts`

## Session Lifecycle and Persistence

Sessions are agent-scoped and persisted on disk under the mounted OpenClaw state directory.

### Key construction

Session keys are normalized to `agent:<agentId>:...` and vary by DM/group/thread shape.

Examples of key builders:

- Main session key: `buildAgentMainSessionKey(...)`
- Peer-scoped key: `buildAgentPeerSessionKey(...)`

### Storage paths

Session persistence is resolved per agent:

- Session store: `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Session transcripts: `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`

For this runtime, `<agentId>` is effectively `nexus` for Telegram-bound traffic.

Path resolution implementation:

- `src/config/sessions/paths.ts`

## Runtime Execution Pipeline

High-level execution path for an inbound message routed to `nexus`:

1. Gateway request/event resolves routing + session context.
2. `agentCommand` orchestrates runtime options and session/model resolution.
3. `runEmbeddedPiAgent` executes the embedded runtime with queueing and model/auth handling.
4. Attempt runtime opens `SessionManager`, prepares session file state, and creates agent session.
5. System prompt is assembled with runtime/tool sections and workspace bootstrap injections.
6. Model/tool loop runs; events stream back through gateway.
7. Final outputs and metadata are persisted to session store/transcript.

Primary pipeline code:

- `src/commands/agent.ts`
- `src/agents/pi-embedded-runner/run.ts`
- `src/agents/pi-embedded-runner/run/attempt.ts`

### Prompt and bootstrap injection

System prompt is OpenClaw-owned and built per run.

Workspace bootstrap files are loaded and injected from the agent workspace (subject to truncation rules), including:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md` (when present)

Prompt/bootstrap components:

- `src/agents/system-prompt.ts`
- `src/agents/workspace.ts`
- `src/agents/bootstrap-files.ts`

## Memory Model

OpenClaw memory has two layers in this runtime model.

### Workspace memory (human memory files)

Primary long-term/rolling files in workspace:

- `MEMORY.md`
- `memory/*.md`

These files are part of the agent's disk memory model and can also be surfaced in context/prompt workflows.

### Memory search tools (`memory_search`, `memory_get`)

Memory tools are only exposed when resolved memory search config is enabled for the current agent.

Decision and tool creation paths:

- `src/agents/memory-search.ts`
- `src/agents/tools/memory-tool.ts`

### Vector/index manager and session sync

When enabled, memory indexing is managed by `MemoryIndexManager`, which can index workspace memory files and (depending on config) session transcript updates.

Core manager path:

- `src/memory/manager.ts`

## Container Runtime Notes

Operational implications for this project runtime:

- The config/state mount (`${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw`) is critical.
  - Wrong host path means gateway may load unexpected config or no config.
- Workspace mount (`${OPENCLAW_WORKSPACE_DIR}:/home/node/workspaces`) must contain the `nexus` workspace path expected by config.
- `HOME=/home/node` in compose aligns with OpenClaw default state conventions under `~/.openclaw`.
- Runtime command in compose (`node dist/index.js gateway ...`) is the active execution path for this deployment model.

## Risks / Observations

1. Mount coupling risk

- Config and session behavior depend on the mounted host directory behind `/home/node/.openclaw`.
- Misconfigured `OPENCLAW_CONFIG_DIR` changes behavior without code changes.

2. Workspace path consistency

- `nexus.workspace` points to `/home/node/workspaces/nexus`.
- If the mounted workspace root does not provide this path, bootstrap/context/memory behavior degrades.

3. Agent scoping correctness

- Session and auth isolation depend on correct `agentId` propagation in routing/session keys.
- Cross-agent contamination is avoided only when keys remain canonical (`agent:<agentId>:...`).

4. Fallback quality assumptions

- Model fallback chain is configured globally in defaults.
- Runtime quality/cost/latency tradeoffs during failover depend on provider/model availability.

5. File-based bootstrap dependency (current behavior)

- Agent context depends on workspace files (`AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, and optional `BOOTSTRAP.md`).
- Any target architecture that moves source data to API/DB must still materialize these artifacts or provide equivalent prompt injection inputs.

6. Current container path model is single-agent-flat

- Current `nexus` workspace path is `/home/node/workspaces/nexus`.
- Target lifecycle design for multi-tenant agents introduces scoped paths by `user_id/agent_id` and requires runtime + factory compatibility.

## Factory Template/Model Implications (For Target Design)

From analysis of `/home/rodrigo/projects/pantheon/core/configs/skills/agent-factory`:

- Template `v2.5` includes significantly more than bootstrap files:
  - governance, decision, protocols, registry, logs, task folders, and version metadata.
- Generation is model-driven; placeholders in template are filled from model YAML.
- Protected files policy exists in generator:
  - `SOUL.md` and `governance/SPECIFIC_GOVERNANCE.md` are preserved unless forced.
- Manifest-based artifact injection exists:
  - model `decision.manifest[]` can inject extra files (e.g., `registry/*`, `protocols/specialized/*`).

Practical implication:

- API persistence must include enough data to reproduce full workspace generation, not only the seven bootstrap documents.
- See `docs/pantheon/agent-lifecycle-async.md` for the asynchronous target flow and required persisted fields.

## Code References

Primary files used to derive this architecture:

- Config/runtime wiring:
  - `runtime/config/openclaw.json`
  - `docker-compose.yml`
  - `Dockerfile`
- Agent scoping and routing:
  - `src/agents/agent-scope.ts`
  - `src/routing/session-key.ts`
- Session storage paths:
  - `src/config/sessions/paths.ts`
- Command/agent runtime:
  - `src/commands/agent.ts`
  - `src/agents/pi-embedded-runner/run.ts`
  - `src/agents/pi-embedded-runner/run/attempt.ts`
- Prompt/bootstrap:
  - `src/agents/system-prompt.ts`
  - `src/agents/workspace.ts`
  - `src/agents/bootstrap-files.ts`
- Memory model:
  - `src/agents/memory-search.ts`
  - `src/agents/tools/memory-tool.ts`
  - `src/memory/manager.ts`

## Scope Confirmation

This document intentionally excludes configuration and runtime context from other repositories. It reflects only the current project state and code paths described above.
