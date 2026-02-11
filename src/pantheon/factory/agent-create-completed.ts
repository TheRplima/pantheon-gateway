import type { ValidateFunction } from "ajv";
import Ajv2020Pkg from "ajv/dist/2020.js";
import fs from "node:fs";
import path from "node:path";

export type AgentCreateCompletedEnvelope = {
  event_name: "agent.create.completed";
  event_version: 1;
  operation_id: string;
  occurred_at: string;
  producer: string;
  agent_id: string;
  user_id: string;
  generation: number;
  payload: {
    paths: {
      active_workspace_path: string;
      disabled_workspace_path: string;
      current_workspace_path: string;
    };
    template: {
      key: string;
      version: string;
      checksum: string;
    };
    model: {
      key: string;
      version: string;
      checksum: string;
    };
    workspace_checks: {
      exists: boolean;
      bootstrap_files_present: Array<
        | "AGENTS.md"
        | "SOUL.md"
        | "TOOLS.md"
        | "IDENTITY.md"
        | "USER.md"
        | "HEARTBEAT.md"
        | "BOOTSTRAP.md"
      >;
    };
  };
};

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeEnvelopeRef(schema: unknown, envelopeId: string): unknown {
  const cloned = JSON.parse(JSON.stringify(schema)) as { allOf?: Array<{ $ref?: string }> };
  if (Array.isArray(cloned.allOf)) {
    for (const item of cloned.allOf) {
      if (item?.$ref === "./envelope.schema.json") {
        item.$ref = envelopeId;
      }
    }
  }
  return cloned;
}

function resolveContractsSchemaDir(cwd = process.cwd()): string {
  return path.resolve(cwd, "packages/contracts/schemas/v1");
}

export function buildAgentCreateCompletedValidator(params?: {
  cwd?: string;
}): ValidateFunction<AgentCreateCompletedEnvelope> {
  const schemaDir = resolveContractsSchemaDir(params?.cwd);
  const envelopeSchemaPath = path.join(schemaDir, "envelope.schema.json");
  const completedSchemaPath = path.join(schemaDir, "agent.create.completed.schema.json");

  const envelopeSchema = readJsonFile(envelopeSchemaPath) as { $id?: string };
  const completedSchema = readJsonFile(completedSchemaPath);

  const Ajv2020Ctor = Ajv2020Pkg as unknown as new (opts?: object) => {
    addSchema: (schema: unknown, key?: string) => void;
    compile: <T = unknown>(schema: unknown) => ValidateFunction<T>;
  };
  const ajv = new Ajv2020Ctor({
    strict: false,
    allErrors: true,
    validateFormats: false,
  });

  const envelopeId = envelopeSchema.$id ?? "pantheon.contracts.v1.envelope";
  ajv.addSchema(envelopeSchema, envelopeId);

  const normalizedSchema = normalizeEnvelopeRef(completedSchema, envelopeId);
  return ajv.compile<AgentCreateCompletedEnvelope>(normalizedSchema);
}

export function validateAgentCreateCompletedEnvelope(
  validator: ValidateFunction<AgentCreateCompletedEnvelope>,
  envelope: unknown,
): { ok: true; envelope: AgentCreateCompletedEnvelope } | { ok: false; errors: string[] } {
  const valid = validator(envelope);
  if (valid) {
    return { ok: true, envelope: envelope as AgentCreateCompletedEnvelope };
  }

  const errors = (validator.errors ?? []).map((err) => {
    const instancePath = err.instancePath || "<root>";
    return `${instancePath}: ${err.message ?? "validation error"}`;
  });

  return { ok: false, errors };
}
