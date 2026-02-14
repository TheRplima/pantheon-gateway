import { describe, expect, it } from "vitest";
import {
  buildLifecycleCallbackValidator,
  validateLifecycleCallbackEnvelope,
} from "./agent-lifecycle-callback.js";

describe("pantheon lifecycle callback validator", () => {
  it("accepts valid agent.create.completed envelope", () => {
    const validator = buildLifecycleCallbackValidator({ eventName: "agent.create.completed" });
    const payload = {
      event_name: "agent.create.completed",
      event_version: 1,
      operation_id: "9efea3d2-67a2-4a12-9361-11d188f90e38",
      occurred_at: "2026-02-11T12:00:00.000Z",
      producer: "gateway-factory",
      agent_id: "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      user_id: "f6ba4f2c-b7e6-4d17-973f-845046120a39",
      generation: 1,
      payload: {
        paths: {
          active_workspace_path: "/tmp/pantheon/workspaces/active/a",
          disabled_workspace_path: "/tmp/pantheon/workspaces/disabled/a",
          current_workspace_path: "/tmp/pantheon/workspaces/active/a",
        },
        template: { key: "agent-factory-template", version: "v2.5", checksum: "sha256:template" },
        model: { key: "orchestrator", version: "2.5.0", checksum: "sha256:model" },
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

    const result = validateLifecycleCallbackEnvelope(validator, payload);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid event payload", () => {
    const validator = buildLifecycleCallbackValidator({ eventName: "agent.activated" });
    const payload = {
      event_name: "agent.activated",
      event_version: 1,
      operation_id: "9efea3d2-67a2-4a12-9361-11d188f90e38",
      occurred_at: "2026-02-11T12:00:00.000Z",
      producer: "gateway-runtime",
      agent_id: "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
      user_id: "f6ba4f2c-b7e6-4d17-973f-845046120a39",
      generation: 1,
      payload: {
        runtime: {
          status: "inactive",
          activated_at: "2026-02-11T12:00:00.000Z",
        },
        paths: {
          active_workspace_path: "/tmp/a",
          disabled_workspace_path: "/tmp/b",
          current_workspace_path: "/tmp/a",
        },
      },
    };

    const result = validateLifecycleCallbackEnvelope(validator, payload);
    expect(result.ok).toBe(false);
  });
});
