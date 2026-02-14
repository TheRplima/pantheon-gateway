import type { ValidateFunction } from "ajv";
import Ajv2020Pkg from "ajv/dist/2020.js";
import fs from "node:fs";
import path from "node:path";
import { resolveContractsSchemaDir } from "../factory/agent-create-requested.js";

export const PANTHEON_CALLBACK_EVENT_NAMES = [
  "agent.create.completed",
  "agent.registered",
  "agent.activated",
] as const;

export type PantheonCallbackEventName = (typeof PANTHEON_CALLBACK_EVENT_NAMES)[number];

export type PantheonLifecycleCallbackEnvelope = {
  event_name: PantheonCallbackEventName;
  event_version: 1;
  operation_id: string;
  occurred_at: string;
  producer: string;
  agent_id: string;
  user_id: string;
  generation: number;
  payload: unknown;
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

function resolveSchemaFileForEventName(eventName: PantheonCallbackEventName): string {
  return `${eventName}.schema.json`;
}

export function buildLifecycleCallbackValidator(params: {
  eventName: PantheonCallbackEventName;
  cwd?: string;
}): ValidateFunction<PantheonLifecycleCallbackEnvelope> {
  const schemaDir = resolveContractsSchemaDir(params.cwd);
  const envelopeSchemaPath = path.join(schemaDir, "envelope.schema.json");
  const eventSchemaPath = path.join(schemaDir, resolveSchemaFileForEventName(params.eventName));

  const envelopeSchema = readJsonFile(envelopeSchemaPath) as { $id?: string };
  const eventSchema = readJsonFile(eventSchemaPath);

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

  const normalizedSchema = normalizeEnvelopeRef(eventSchema, envelopeId);
  return ajv.compile<PantheonLifecycleCallbackEnvelope>(normalizedSchema);
}

export function validateLifecycleCallbackEnvelope(
  validator: ValidateFunction<PantheonLifecycleCallbackEnvelope>,
  envelope: unknown,
): { ok: true; envelope: PantheonLifecycleCallbackEnvelope } | { ok: false; errors: string[] } {
  const valid = validator(envelope);
  if (valid) {
    return { ok: true, envelope };
  }

  const errors = (validator.errors ?? []).map((err) => {
    const instancePath = err.instancePath || "<root>";
    return `${instancePath}: ${err.message ?? "validation error"}`;
  });

  return { ok: false, errors };
}
