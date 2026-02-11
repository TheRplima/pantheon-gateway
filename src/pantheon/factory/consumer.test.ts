import { describe, expect, it } from "vitest";
import { __testOnly, isPantheonFactoryConsumerEnabled } from "./consumer.js";

describe("pantheon factory consumer env gate", () => {
  it("is disabled by default", () => {
    expect(isPantheonFactoryConsumerEnabled({})).toBe(false);
  });

  it("is enabled when flag is truthy", () => {
    expect(isPantheonFactoryConsumerEnabled({ PANTHEON_FACTORY_CONSUMER_ENABLED: "1" })).toBe(true);
  });
});

describe("pantheon factory consumer completed envelope", () => {
  it("maps request + provision result into create.completed envelope", () => {
    const envelope = __testOnly.buildCreateCompletedEnvelope({
      nowIso: "2026-02-11T12:00:08Z",
      producer: "gateway-factory",
      source: {
        event_name: "agent.create.requested",
        event_version: 1,
        operation_id: "e3cb297b-18f1-4f71-a5eb-f842d0f95e54",
        occurred_at: "2026-02-11T12:00:00Z",
        producer: "api-worker",
        agent_id: "ba11f8a1-e84d-4cb0-ae19-c3dbf1001f34",
        user_id: "f6ba4f2c-b7e6-4d17-973f-845046120a39",
        generation: 1,
        payload: {
          desired_state: "active",
          agent_name: "Nexus",
          agent_type: "ORCHESTRATOR",
          domain: "governance",
          template: { key: "agent-factory-template", version: "v2.5" },
          model: { key: "orchestrator", version: "2.5.0", type: "authoring" },
          paths: {
            active_workspace_path: "/tmp/a",
            disabled_workspace_path: "/tmp/b",
            current_workspace_path: "/tmp/a",
          },
          requested_by: "f6ba4f2c-b7e6-4d17-973f-845046120a39",
        },
      },
      provisionResult: {
        templateChecksum: "sha256:template",
        modelChecksum: "sha256:model",
        workspaceExists: true,
        bootstrapFilesPresent: [
          "AGENTS.md",
          "SOUL.md",
          "TOOLS.md",
          "IDENTITY.md",
          "USER.md",
          "HEARTBEAT.md",
          "BOOTSTRAP.md",
        ],
      },
    });

    expect(envelope.event_name).toBe("agent.create.completed");
    expect(envelope.producer).toBe("gateway-factory");
    expect(envelope.payload.template.checksum).toBe("sha256:template");
    expect(envelope.payload.model.checksum).toBe("sha256:model");
    expect(envelope.payload.workspace_checks.exists).toBe(true);
  });
});
