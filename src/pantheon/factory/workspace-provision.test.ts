import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { AgentCreateRequestedEnvelope } from "./agent-create-requested.js";
import { provisionWorkspaceFromCreateRequested } from "./workspace-provision.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function buildEnvelope(params?: {
  agentType?: "ENTRY" | "SERVICE" | "ORCHESTRATOR";
  modelKey?: string;
  workspacePath?: string;
}): AgentCreateRequestedEnvelope {
  return {
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
      agent_type: params?.agentType ?? "ORCHESTRATOR",
      domain: "governance",
      template: {
        key: "agent-factory-template",
        version: "v2.5",
      },
      model: {
        key: params?.modelKey ?? "orchestrator",
        version: "2.5.0",
        type: "authoring",
      },
      paths: {
        active_workspace_path: params?.workspacePath ?? "/tmp/active",
        disabled_workspace_path: "/tmp/disabled",
        current_workspace_path: params?.workspacePath ?? "/tmp/active",
      },
      requested_by: "f6ba4f2c-b7e6-4d17-973f-845046120a39",
    },
  };
}

describe("pantheon workspace provision", () => {
  it("creates workspace and bootstrap files for orchestrator", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pantheon-factory-test-"));
    tempDirs.push(tmpDir);

    const workspacePath = path.join(tmpDir, "workspace");
    const envelope = buildEnvelope({
      workspacePath,
      agentType: "ORCHESTRATOR",
      modelKey: "orchestrator",
    });

    const result = provisionWorkspaceFromCreateRequested(envelope);

    expect(result.workspaceExists).toBe(true);
    expect(result.templateChecksum.startsWith("sha256:")).toBe(true);
    expect(result.modelChecksum.startsWith("sha256:")).toBe(true);

    expect(fs.existsSync(path.join(workspacePath, "AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspacePath, "SOUL.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspacePath, "IDENTITY.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspacePath, ".agent_version.json"))).toBe(true);

    expect(result.bootstrapFilesPresent).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        "SOUL.md",
        "TOOLS.md",
        "IDENTITY.md",
        "USER.md",
        "HEARTBEAT.md",
        "BOOTSTRAP.md",
      ]),
    );
  });

  it("uses USER_STATELESS as USER.md for service agents", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pantheon-factory-test-"));
    tempDirs.push(tmpDir);

    const workspacePath = path.join(tmpDir, "workspace");
    const envelope = buildEnvelope({ workspacePath, agentType: "SERVICE", modelKey: "docsmith" });

    provisionWorkspaceFromCreateRequested(envelope);

    expect(fs.existsSync(path.join(workspacePath, "USER.md"))).toBe(true);
    expect(fs.existsSync(path.join(workspacePath, "USER_SPECIALIZATION.md"))).toBe(false);

    const userContent = fs.readFileSync(path.join(workspacePath, "USER.md"), "utf8");
    expect(userContent).toContain("SERVICE");
  });
});
