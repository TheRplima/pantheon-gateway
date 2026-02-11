# Event Payload Examples (Canonical)

## Notes

- Examples follow `docs/pantheon/agent-queue-payload-schemas.md`.
- UUIDs and paths are illustrative.

## 1) agent.provision.requested

```json
{
  "event_name": "agent.provision.requested",
  "event_version": 1,
  "operation_id": "e3cb297b-18f1-4f71-a5eb-f842d0f95e54",
  "occurred_at": "2026-02-11T12:00:00Z",
  "producer": "api-worker",
  "agent_id": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
  "user_id": "f6ba4f2c-b7e6-4d17-973f-845046120a39",
  "generation": 1,
  "payload": {
    "desired_state": "active",
    "agent_name": "Nexus",
    "agent_type": "ORCHESTRATOR",
    "domain": "governance",
    "template": { "key": "agent-factory-template", "version": "v2.5", "checksum": "sha256:..." },
    "model": { "key": "orchestrator", "version": "2.5.0", "type": "ORCHESTRATOR", "checksum": "sha256:..." },
    "factory": { "template_version": "v2.5", "force": false, "register": false },
    "paths": {
      "active_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "disabled_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/disabled/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "current_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34"
    }
  }
}
```

## 2) agent.workspace.ready

```json
{
  "event_name": "agent.workspace.ready",
  "event_version": 1,
  "operation_id": "87da96bc-6036-41b2-a046-d5a89603e922",
  "occurred_at": "2026-02-11T12:00:08Z",
  "producer": "factory-worker",
  "agent_id": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
  "user_id": "f6ba4f2c-b7e6-4d17-973f-845046120a39",
  "generation": 1,
  "payload": {
    "paths": {
      "active_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "disabled_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/disabled/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "current_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34"
    },
    "template": { "key": "agent-factory-template", "version": "v2.5", "checksum": "sha256:..." },
    "model": { "key": "orchestrator", "version": "2.5.0", "checksum": "sha256:..." },
    "render": {
      "rendered_files": ["AGENTS.md", "SOUL.md", "IDENTITY.md"],
      "protected_files_skipped": [],
      "manifest_applied": ["registry/agents.yaml"]
    },
    "workspace_checks": {
      "exists": true,
      "bootstrap_files_present": ["AGENTS.md", "SOUL.md", "TOOLS.md", "IDENTITY.md", "USER.md", "HEARTBEAT.md", "BOOTSTRAP.md"]
    }
  }
}
```

## 3) agent.runtime.register.requested

```json
{
  "event_name": "agent.runtime.register.requested",
  "event_version": 1,
  "operation_id": "1f13a8cb-2251-4f58-8164-63720de06d89",
  "occurred_at": "2026-02-11T12:00:10Z",
  "producer": "api-worker",
  "agent_id": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
  "user_id": "f6ba4f2c-b7e6-4d17-973f-845046120a39",
  "generation": 1,
  "payload": {
    "agent_config": {
      "id": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "name": "Nexus",
      "workspace": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "model": "github-copilot/gpt-4.1",
      "heartbeat": { "every": "2m" },
      "enabled": true
    },
    "bindings": [
      {
        "agentId": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
        "match": { "channel": "telegram" }
      }
    ],
    "paths": {
      "active_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "disabled_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/disabled/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "current_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34"
    }
  }
}
```

## 4) agent.activated

```json
{
  "event_name": "agent.activated",
  "event_version": 1,
  "operation_id": "1bfae738-ed74-4dcb-bf7b-68b7ff84deb1",
  "occurred_at": "2026-02-11T12:00:22Z",
  "producer": "runtime-worker",
  "agent_id": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
  "user_id": "f6ba4f2c-b7e6-4d17-973f-845046120a39",
  "generation": 1,
  "payload": {
    "paths": {
      "active_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "disabled_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/disabled/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "current_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34"
    },
    "gateway": {
      "reloaded": true,
      "healthcheck_ok": true,
      "instance": "openclaw-gateway"
    },
    "runtime_status": "active"
  }
}
```

## 5) agent.deactivation.requested

```json
{
  "event_name": "agent.deactivation.requested",
  "event_version": 1,
  "operation_id": "f4b0c6cd-ab31-4854-bcc3-98d3b88dc4bb",
  "occurred_at": "2026-02-11T13:00:00Z",
  "producer": "api-worker",
  "agent_id": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
  "user_id": "f6ba4f2c-b7e6-4d17-973f-845046120a39",
  "generation": 2,
  "payload": {
    "paths": {
      "active_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "disabled_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/disabled/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "current_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34"
    },
    "drain_policy": {
      "mode": "graceful",
      "timeout_seconds": 120
    }
  }
}
```

## 6) agent.deactivated

```json
{
  "event_name": "agent.deactivated",
  "event_version": 1,
  "operation_id": "32f4a2ca-7f90-4e3c-b28d-b64592e168fd",
  "occurred_at": "2026-02-11T13:00:15Z",
  "producer": "workspace-worker",
  "agent_id": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
  "user_id": "f6ba4f2c-b7e6-4d17-973f-845046120a39",
  "generation": 2,
  "payload": {
    "paths": {
      "active_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "disabled_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/disabled/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      "current_workspace_path": "/home/node/workspaces/f6ba4f2c-b7e6-4d17-973f-845046120a39/disabled/ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34"
    },
    "runtime_status": "inactive",
    "registration_removed": true
  }
}
```

## 7) agent.failed

```json
{
  "event_name": "agent.failed",
  "event_version": 1,
  "operation_id": "d8c52190-f10c-4eb6-9fa8-c3c9eaeb3681",
  "occurred_at": "2026-02-11T13:10:00Z",
  "producer": "runtime-worker",
  "agent_id": "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
  "user_id": "f6ba4f2c-b7e6-4d17-973f-845046120a39",
  "generation": 2,
  "payload": {
    "failed_step": "gateway_reload",
    "error_code": "GW_HEALTHCHECK_TIMEOUT",
    "error_message": "Gateway did not report healthy within timeout window",
    "retryable": true,
    "details": {
      "timeout_seconds": 45,
      "instance": "openclaw-gateway"
    }
  }
}
```
