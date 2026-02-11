import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAgentCreateCompletedValidator,
  validateAgentCreateCompletedEnvelope,
} from "./agent-create-completed.js";

describe("pantheon agent.create.completed validator", () => {
  it("accepts valid completed payload", () => {
    const validator = buildAgentCreateCompletedValidator();
    const payload = {
      event_name: "agent.create.completed",
      event_version: 1,
      operation_id: "e3cb297b-18f1-4f71-a5eb-f842d0f95e54",
      occurred_at: "2026-02-11T12:00:00Z",
      producer: "gateway-factory",
      agent_id: "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      user_id: "f6ba4f2c-b7e6-4d17-973f-845046120a39",
      generation: 1,
      payload: {
        paths: {
          active_workspace_path: "/tmp/a",
          disabled_workspace_path: "/tmp/b",
          current_workspace_path: "/tmp/a",
        },
        template: {
          key: "agent-factory-template",
          version: "v2.5",
          checksum: "sha256:abc",
        },
        model: {
          key: "orchestrator",
          version: "2.5.0",
          checksum: "sha256:def",
        },
        workspace_checks: {
          exists: true,
          bootstrap_files_present: [
            "AGENTS.md",
            "SOUL.md",
            "TOOLS.md",
            "IDENTITY.md",
            "USER.md",
            "HEARTBEAT.md",
            "BOOTSTRAP.md",
          ],
        },
      },
    };

    const result = validateAgentCreateCompletedEnvelope(validator, payload);
    expect(result.ok).toBe(true);
  });

  it("rejects missing checksum", () => {
    const validator = buildAgentCreateCompletedValidator();
    const payload = {
      event_name: "agent.create.completed",
      event_version: 1,
      operation_id: "e3cb297b-18f1-4f71-a5eb-f842d0f95e54",
      occurred_at: "2026-02-11T12:00:00Z",
      producer: "gateway-factory",
      agent_id: "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      user_id: "f6ba4f2c-b7e6-4d17-973f-845046120a39",
      generation: 1,
      payload: {
        paths: {
          active_workspace_path: "/tmp/a",
          disabled_workspace_path: "/tmp/b",
          current_workspace_path: "/tmp/a",
        },
        template: {
          key: "agent-factory-template",
          version: "v2.5",
        },
        model: {
          key: "orchestrator",
          version: "2.5.0",
          checksum: "sha256:def",
        },
        workspace_checks: {
          exists: true,
          bootstrap_files_present: ["AGENTS.md"],
        },
      },
    };

    const result = validateAgentCreateCompletedEnvelope(validator, payload);
    expect(result.ok).toBe(false);
  });

  it("schema file exists", () => {
    const schemaPath = path.resolve(
      process.cwd(),
      "packages/contracts/schemas/v1/agent.create.completed.schema.json",
    );
    expect(fs.existsSync(schemaPath)).toBe(true);
  });
});
