# Agent Queue Payload Schemas (RabbitMQ)

## Envelope (common to all events)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "pantheon.agent.lifecycle.envelope.v1",
  "type": "object",
  "required": [
    "event_name",
    "event_version",
    "operation_id",
    "occurred_at",
    "producer",
    "agent_id",
    "user_id",
    "generation",
    "payload"
  ],
  "properties": {
    "event_name": {
      "type": "string",
      "enum": [
        "agent.provision.requested",
        "agent.workspace.ready",
        "agent.runtime.register.requested",
        "agent.runtime.registered",
        "agent.activation.requested",
        "agent.activated",
        "agent.deactivation.requested",
        "agent.deactivated",
        "agent.failed"
      ]
    },
    "event_version": { "type": "integer", "minimum": 1 },
    "operation_id": { "type": "string", "format": "uuid" },
    "correlation_id": { "type": "string", "format": "uuid" },
    "causation_id": { "type": "string", "format": "uuid" },
    "occurred_at": { "type": "string", "format": "date-time" },
    "producer": { "type": "string", "minLength": 1 },
    "agent_id": { "type": "string", "format": "uuid" },
    "user_id": { "type": "string", "format": "uuid" },
    "generation": { "type": "integer", "minimum": 1 },
    "payload": { "type": "object" }
  },
  "additionalProperties": false
}
```

## Common Agent Path Object

```json
{
  "$id": "pantheon.agent.paths.v1",
  "type": "object",
  "required": ["active_workspace_path", "disabled_workspace_path", "current_workspace_path"],
  "properties": {
    "active_workspace_path": {
      "type": "string",
      "const": "/home/node/workspaces/{user_id}/{agent_id}"
    },
    "disabled_workspace_path": {
      "type": "string",
      "const": "/home/node/workspaces/{user_id}/disabled/{agent_id}"
    },
    "current_workspace_path": { "type": "string", "minLength": 1 }
  },
  "additionalProperties": false
}
```

Note: runtime payloads should carry concrete resolved values, not the literal placeholders above.

## agent.provision.requested

```json
{
  "$id": "pantheon.agent.provision.requested.v1",
  "type": "object",
  "required": [
    "desired_state",
    "agent_name",
    "agent_type",
    "domain",
    "template",
    "model",
    "factory",
    "paths"
  ],
  "properties": {
    "desired_state": { "type": "string", "enum": ["active", "inactive"] },
    "agent_name": { "type": "string", "minLength": 1 },
    "agent_type": { "type": "string", "enum": ["ENTRY", "SERVICE", "ORCHESTRATOR"] },
    "domain": { "type": "string", "minLength": 1 },
    "template": {
      "type": "object",
      "required": ["key", "version"],
      "properties": {
        "key": { "type": "string", "minLength": 1 },
        "version": { "type": "string", "minLength": 1 },
        "checksum": { "type": "string", "minLength": 1 }
      },
      "additionalProperties": false
    },
    "model": {
      "type": "object",
      "required": ["key", "version", "type"],
      "properties": {
        "key": { "type": "string", "minLength": 1 },
        "version": { "type": "string", "minLength": 1 },
        "type": { "type": "string", "enum": ["ENTRY", "SERVICE", "ORCHESTRATOR"] },
        "checksum": { "type": "string", "minLength": 1 },
        "snapshot": { "type": "object" }
      },
      "additionalProperties": false
    },
    "factory": {
      "type": "object",
      "required": ["template_version", "force", "register"],
      "properties": {
        "template_version": { "type": "string", "minLength": 1 },
        "force": { "type": "boolean" },
        "register": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "paths": { "$ref": "pantheon.agent.paths.v1" },
    "overrides": {
      "type": "object",
      "properties": {
        "identity": { "type": "object" },
        "soul": { "type": "object" },
        "governance": { "type": "object" },
        "decision": { "type": "object" },
        "user_context": { "type": "object" }
      },
      "additionalProperties": false
    },
    "requested_by": { "type": "string", "format": "uuid" }
  },
  "additionalProperties": false
}
```

## agent.workspace.ready

```json
{
  "$id": "pantheon.agent.workspace.ready.v1",
  "type": "object",
  "required": ["paths", "template", "model", "render", "workspace_checks"],
  "properties": {
    "paths": { "$ref": "pantheon.agent.paths.v1" },
    "template": {
      "type": "object",
      "required": ["key", "version", "checksum"],
      "properties": {
        "key": { "type": "string" },
        "version": { "type": "string" },
        "checksum": { "type": "string" }
      },
      "additionalProperties": false
    },
    "model": {
      "type": "object",
      "required": ["key", "version", "checksum"],
      "properties": {
        "key": { "type": "string" },
        "version": { "type": "string" },
        "checksum": { "type": "string" }
      },
      "additionalProperties": false
    },
    "render": {
      "type": "object",
      "required": ["rendered_files", "protected_files_skipped"],
      "properties": {
        "rendered_files": { "type": "array", "items": { "type": "string" } },
        "protected_files_skipped": { "type": "array", "items": { "type": "string" } },
        "manifest_applied": { "type": "array", "items": { "type": "string" } },
        "agent_version_json": { "type": "object" }
      },
      "additionalProperties": false
    },
    "workspace_checks": {
      "type": "object",
      "required": ["exists", "bootstrap_files_present"],
      "properties": {
        "exists": { "type": "boolean" },
        "bootstrap_files_present": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": [
              "AGENTS.md",
              "SOUL.md",
              "TOOLS.md",
              "IDENTITY.md",
              "USER.md",
              "HEARTBEAT.md",
              "BOOTSTRAP.md"
            ]
          }
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

## agent.runtime.register.requested

```json
{
  "$id": "pantheon.agent.runtime.register.requested.v1",
  "type": "object",
  "required": ["agent_config", "bindings", "paths"],
  "properties": {
    "agent_config": {
      "type": "object",
      "required": ["id", "name", "workspace", "model"],
      "properties": {
        "id": { "type": "string", "format": "uuid" },
        "name": { "type": "string" },
        "workspace": { "type": "string" },
        "model": { "type": "string" },
        "heartbeat": {
          "type": "object",
          "properties": {
            "every": { "type": "string" }
          },
          "additionalProperties": false
        },
        "enabled": { "type": "boolean" }
      },
      "additionalProperties": false
    },
    "bindings": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["agentId", "match"],
        "properties": {
          "agentId": { "type": "string", "format": "uuid" },
          "match": { "type": "object" }
        },
        "additionalProperties": false
      }
    },
    "paths": { "$ref": "pantheon.agent.paths.v1" }
  },
  "additionalProperties": false
}
```

## agent.runtime.registered

```json
{
  "$id": "pantheon.agent.runtime.registered.v1",
  "type": "object",
  "required": ["runtime_config_path", "config_revision", "registration_status"],
  "properties": {
    "runtime_config_path": { "type": "string" },
    "config_revision": { "type": "integer", "minimum": 1 },
    "registration_status": { "type": "string", "enum": ["registered", "updated", "removed"] },
    "gateway_reload_required": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

## agent.activation.requested

```json
{
  "$id": "pantheon.agent.activation.requested.v1",
  "type": "object",
  "required": ["paths", "mode"],
  "properties": {
    "paths": { "$ref": "pantheon.agent.paths.v1" },
    "mode": { "type": "string", "enum": ["activate", "reactivate"] },
    "registration_required": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

## agent.activated

```json
{
  "$id": "pantheon.agent.activated.v1",
  "type": "object",
  "required": ["paths", "gateway", "runtime_status"],
  "properties": {
    "paths": { "$ref": "pantheon.agent.paths.v1" },
    "gateway": {
      "type": "object",
      "required": ["reloaded", "healthcheck_ok"],
      "properties": {
        "reloaded": { "type": "boolean" },
        "healthcheck_ok": { "type": "boolean" },
        "instance": { "type": "string" }
      },
      "additionalProperties": false
    },
    "runtime_status": { "type": "string", "enum": ["active"] }
  },
  "additionalProperties": false
}
```

## agent.deactivation.requested

```json
{
  "$id": "pantheon.agent.deactivation.requested.v1",
  "type": "object",
  "required": ["paths", "drain_policy"],
  "properties": {
    "paths": { "$ref": "pantheon.agent.paths.v1" },
    "drain_policy": {
      "type": "object",
      "required": ["mode", "timeout_seconds"],
      "properties": {
        "mode": { "type": "string", "enum": ["graceful", "force"] },
        "timeout_seconds": { "type": "integer", "minimum": 0 }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

## agent.deactivated

```json
{
  "$id": "pantheon.agent.deactivated.v1",
  "type": "object",
  "required": ["paths", "runtime_status"],
  "properties": {
    "paths": { "$ref": "pantheon.agent.paths.v1" },
    "runtime_status": { "type": "string", "enum": ["inactive"] },
    "registration_removed": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

## agent.failed

```json
{
  "$id": "pantheon.agent.failed.v1",
  "type": "object",
  "required": ["failed_step", "error_code", "error_message", "retryable"],
  "properties": {
    "failed_step": {
      "type": "string",
      "enum": [
        "provision",
        "workspace_move",
        "runtime_register",
        "runtime_unregister",
        "gateway_reload",
        "healthcheck"
      ]
    },
    "error_code": { "type": "string", "minLength": 1 },
    "error_message": { "type": "string", "minLength": 1 },
    "retryable": { "type": "boolean" },
    "details": { "type": "object" }
  },
  "additionalProperties": false
}
```
