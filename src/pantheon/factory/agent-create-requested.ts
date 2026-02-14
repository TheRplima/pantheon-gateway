import type { ValidateFunction } from "ajv";
import Ajv2020Pkg from "ajv/dist/2020.js";
import fs from "node:fs";
import path from "node:path";

export type PantheonFactoryLog = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  debug?: (msg: string) => void;
};

export type AgentCreateRequestedEnvelope = {
  event_name: "agent.create.requested";
  event_version: 1;
  operation_id: string;
  occurred_at: string;
  producer: string;
  agent_id: string;
  user_id: string;
  generation: number;
  payload: {
    desired_state: "active" | "inactive";
    agent_name: string;
    agent_type: "ENTRY" | "SERVICE" | "ORCHESTRATOR";
    domain: string;
    template: {
      key: string;
      version: string;
      checksum?: string;
    };
    model: {
      key: string;
      version: string;
      type: "authoring" | "execution";
    };
    paths: {
      active_workspace_path: string;
      disabled_workspace_path: string;
      current_workspace_path: string;
    };
    requested_by?: string;
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

export function resolveContractsSchemaDir(cwd = process.cwd()): string {
  return path.resolve(cwd, "packages/contracts/schemas/v1");
}

export function buildAgentCreateRequestedValidator(params?: {
  cwd?: string;
}): ValidateFunction<AgentCreateRequestedEnvelope> {
  const schemaDir = resolveContractsSchemaDir(params?.cwd);
  const envelopeSchemaPath = path.join(schemaDir, "envelope.schema.json");
  const createSchemaPath = path.join(schemaDir, "agent.create.requested.schema.json");

  const envelopeSchema = readJsonFile(envelopeSchemaPath) as { $id?: string };
  const createRequestedSchema = readJsonFile(createSchemaPath);

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

  const normalizedSchema = normalizeEnvelopeRef(createRequestedSchema, envelopeId);
  return ajv.compile<AgentCreateRequestedEnvelope>(normalizedSchema);
}

export function parseEnvelopeJson(payload: string): unknown {
  return JSON.parse(payload);
}

export function validateAgentCreateRequestedEnvelope(
  validator: ValidateFunction<AgentCreateRequestedEnvelope>,
  envelope: unknown,
): { ok: true; envelope: AgentCreateRequestedEnvelope } | { ok: false; errors: string[] } {
  const valid = validator(envelope);
  if (valid) {
    return { ok: true, envelope };
  }

  const errors = (validator.errors ?? []).map((err) => {
    const path = err.instancePath || "<root>";
    return `${path}: ${err.message ?? "validation error"}`;
  });

  return { ok: false, errors };
}
