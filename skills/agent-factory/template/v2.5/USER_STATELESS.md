# USER.md - Stateless Context

<!-- :::meta
template_version: v2.5
marker_schema: v1.0
::: -->

<!-- :::immutable -->
*This is a Stateless Service/Orchestrator workspace. Persistent user data is NOT stored here.*
<!-- ::: -->

## Policy

As a **{{AGENT_TYPE}}**, I remain user-agnostic. I receive the necessary human context dynamically via **BRIEFs** or task-specific metadata. 

- **Identity**: Context is provided per-request.
- **Privacy**: No PII is persisted in this workspace.
- **Reference**: For the master user profile, consult the **ENTRY** agent in charge of this session.

---

<!-- :::immutable -->
Compatibility: OpenClaw Standard v2.x
<!-- ::: -->
