import fs from "node:fs";
import path from "node:path";
import Ajv, { type ValidateFunction } from "ajv";

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

  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    validateFormats: false,
  });

  const envelopeId = envelopeSchema.$id ?? "pantheon.contracts.v1.envelope";
  ajv.addSchema(envelopeSchema, envelopeId);

  return ajv.compile<AgentCreateRequestedEnvelope>(createRequestedSchema);
}

export function parseEnvelopeJson(payload: string): unknown {
  return JSON.parse(payload);
}

export function validateAgentCreateRequestedEnvelope(
  validator: ValidateFunction<AgentCreateRequestedEnvelope>,
  envelope: unknown,
):
  | { ok: true; envelope: AgentCreateRequestedEnvelope }
  | { ok: false; errors: string[] } {
  const valid = validator(envelope);
  if (valid) {
    return { ok: true, envelope: envelope as AgentCreateRequestedEnvelope };
  }

  const errors = (validator.errors ?? []).map((err) => {
    const path = err.instancePath || "<root>";
    return `${path}: ${err.message ?? "validation error"}`;
  });

  return { ok: false, errors };
}
