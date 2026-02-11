import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAgentCreateRequestedValidator,
  parseEnvelopeJson,
  resolveContractsSchemaDir,
  validateAgentCreateRequestedEnvelope,
} from "./agent-create-requested.js";

describe("pantheon agent.create.requested validator", () => {
  it("accepts v1 example payload", () => {
    const validator = buildAgentCreateRequestedValidator();
    const examplesDir = path.resolve(process.cwd(), "packages/contracts/examples/v1");
    const payload = fs.readFileSync(path.join(examplesDir, "agent.create.requested.json"), "utf8");

    const envelope = parseEnvelopeJson(payload);
    const result = validateAgentCreateRequestedEnvelope(validator, envelope);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`unexpected validation failure: ${result.errors.join(" | ")}`);
    }
    expect(result.envelope.event_name).toBe("agent.create.requested");
  });

  it("rejects payload missing required fields", () => {
    const validator = buildAgentCreateRequestedValidator();
    const envelope = {
      event_name: "agent.create.requested",
      event_version: 1,
      operation_id: "x",
    };

    const result = validateAgentCreateRequestedEnvelope(validator, envelope);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected invalid payload");
    }
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("resolves schema dir under packages/contracts", () => {
    const schemaDir = resolveContractsSchemaDir();
    expect(schemaDir.endsWith("packages/contracts/schemas/v1")).toBe(true);
  });
});
