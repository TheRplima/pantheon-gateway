# HEARTBEAT.md

<!-- :::meta
template_version: v2.5
marker_schema: v1.0
::: -->

# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.

## Pantheon Checks

- [ ] Check `tasks/inbox/` for incoming `task_[ID]` folders
- [ ] Verify alignment with `governance/DRIFT_RULES.md`
- [ ] Log quality metrics to `logs/QUALITY_METRICS.md`
- [ ] Review decision log in `logs/decision_log.md` for patterns

:::role:ORCHESTRATOR
## Orchestration Layer (Advanced)

*(Tasks for system health and multi-agent coordination)*

- [ ] Check `dispatch/queue/` for pending task assignments
- [ ] Monitor agent pulse in `registry/AGENTS_STATE.md`
- [ ] Rotate/Archive old session logs and tasks
- [ ] Verify global Evidence ledger consistency
:::
