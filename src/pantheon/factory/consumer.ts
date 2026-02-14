import { isTruthyEnvValue } from "../../infra/env.js";
import {
  PANTHEON_EVENT_CREATE_COMPLETED,
  PANTHEON_LIFECYCLE_EXCHANGE,
  PANTHEON_QUEUE_FACTORY,
} from "../lifecycle/rabbitmq-routing.js";
import {
  buildAgentCreateCompletedValidator,
  validateAgentCreateCompletedEnvelope,
  type AgentCreateCompletedEnvelope,
} from "./agent-create-completed.js";
import {
  buildAgentCreateRequestedValidator,
  parseEnvelopeJson,
  type AgentCreateRequestedEnvelope,
  type PantheonFactoryLog,
  validateAgentCreateRequestedEnvelope,
} from "./agent-create-requested.js";
import { createRabbitManagementApiClient } from "./management-api.js";
import { provisionWorkspaceFromCreateRequested } from "./workspace-provision.js";

const FACTORY_QUEUE = PANTHEON_QUEUE_FACTORY;

export type PantheonFactoryConsumerHandle = {
  stop: () => Promise<void>;
};

export type PantheonFactoryConsumerDeps = {
  provisionWorkspace: typeof provisionWorkspaceFromCreateRequested;
  nowIso: () => string;
};

function defaultDeps(): PantheonFactoryConsumerDeps {
  return {
    provisionWorkspace: provisionWorkspaceFromCreateRequested,
    nowIso: () => new Date().toISOString(),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodePayloadAsString(payload: unknown, encoding?: string): string {
  if (typeof payload === "string") {
    if (encoding === "base64") {
      return Buffer.from(payload, "base64").toString("utf8");
    }
    return payload;
  }
  return JSON.stringify(payload);
}

function formatLifecycleLog(fields: Record<string, string | number | boolean | undefined>): string {
  const parts = Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`);
  return `pantheon.lifecycle ${parts.join(" ")}`;
}

export function isPantheonFactoryConsumerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return isTruthyEnvValue(env.PANTHEON_FACTORY_CONSUMER_ENABLED);
}

function resolvePollingIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env.PANTHEON_FACTORY_POLL_MS ?? "2000", 10);
  if (Number.isNaN(parsed) || parsed < 250) {
    return 2000;
  }
  return parsed;
}

function validateRequiredEnv(
  env: NodeJS.ProcessEnv,
):
  | { ok: true; config: { apiUrl: string; user: string; pass: string; vhost: string } }
  | { ok: false; reason: string } {
  const apiUrl = env.RABBITMQ_API_URL?.trim();
  const user = env.RABBITMQ_USER?.trim();
  const pass = env.RABBITMQ_PASS ?? "";
  const vhost = env.RABBITMQ_VHOST?.trim() || "/pantheon";

  if (!apiUrl) {
    return { ok: false, reason: "RABBITMQ_API_URL not set" };
  }
  if (!user) {
    return { ok: false, reason: "RABBITMQ_USER not set" };
  }
  if (!pass) {
    return { ok: false, reason: "RABBITMQ_PASS not set" };
  }

  return {
    ok: true,
    config: {
      apiUrl,
      user,
      pass,
      vhost,
    },
  };
}

function buildCreateCompletedEnvelope(params: {
  nowIso: string;
  producer: string;
  source: AgentCreateRequestedEnvelope;
  provisionResult: ReturnType<typeof provisionWorkspaceFromCreateRequested>;
}): AgentCreateCompletedEnvelope {
  const { source, provisionResult } = params;

  return {
    event_name: "agent.create.completed",
    event_version: 1,
    operation_id: source.operation_id,
    occurred_at: params.nowIso,
    producer: params.producer,
    agent_id: source.agent_id,
    user_id: source.user_id,
    generation: source.generation,
    payload: {
      paths: source.payload.paths,
      template: {
        key: source.payload.template.key,
        version: source.payload.template.version,
        checksum: provisionResult.templateChecksum,
      },
      model: {
        key: source.payload.model.key,
        version: source.payload.model.version,
        checksum: provisionResult.modelChecksum,
      },
      workspace_checks: {
        exists: provisionResult.workspaceExists,
        bootstrap_files_present: provisionResult.bootstrapFilesPresent,
      },
    },
  };
}

export function startPantheonFactoryConsumer(params: {
  log: PantheonFactoryLog;
  env?: NodeJS.ProcessEnv;
  deps?: Partial<PantheonFactoryConsumerDeps>;
}): PantheonFactoryConsumerHandle | null {
  const env = params.env ?? process.env;
  const { log } = params;
  const deps = { ...defaultDeps(), ...params.deps };

  if (!isPantheonFactoryConsumerEnabled(env)) {
    return null;
  }

  const envCheck = validateRequiredEnv(env);
  if (!envCheck.ok) {
    log.warn(`pantheon factory consumer disabled: ${envCheck.reason}`);
    return null;
  }

  const createRequestedValidator = buildAgentCreateRequestedValidator();
  const createCompletedValidator = buildAgentCreateCompletedValidator();
  const pollingMs = resolvePollingIntervalMs(env);
  const client = createRabbitManagementApiClient({
    baseUrl: envCheck.config.apiUrl,
    user: envCheck.config.user,
    pass: envCheck.config.pass,
  });

  const producerName = env.PANTHEON_FACTORY_PRODUCER?.trim() || "gateway-factory";

  let stopping = false;
  const loopPromise = (async () => {
    log.info(
      `pantheon factory consumer started: queue=${FACTORY_QUEUE} vhost=${envCheck.config.vhost} pollMs=${pollingMs}`,
    );

    while (!stopping) {
      try {
        const messages = await client.getMessages({
          vhost: envCheck.config.vhost,
          queue: FACTORY_QUEUE,
          count: 10,
        });

        for (const message of messages) {
          try {
            const envelopeRaw = parseEnvelopeJson(
              decodePayloadAsString(message.payload, message.payload_encoding),
            ) as { event_name?: string };
            const validated = validateAgentCreateRequestedEnvelope(
              createRequestedValidator,
              envelopeRaw,
            );
            if (!validated.ok) {
              log.warn(
                `${formatLifecycleLog({
                  stream: "factory",
                  event_name:
                    typeof envelopeRaw.event_name === "string" ? envelopeRaw.event_name : "unknown",
                })} action=rejected reason="${validated.errors.join(" | ")}"`,
              );
              continue;
            }

            const envelope = validated.envelope;
            log.info(
              `${formatLifecycleLog({
                stream: "factory",
                event_name: envelope.event_name,
                operation_id: envelope.operation_id,
                agent_id: envelope.agent_id,
                generation: envelope.generation,
              })} action=accepted`,
            );

            const provisionResult = deps.provisionWorkspace(envelope);

            const completedEnvelope = buildCreateCompletedEnvelope({
              nowIso: deps.nowIso(),
              producer: producerName,
              source: envelope,
              provisionResult,
            });

            const completedValidation = validateAgentCreateCompletedEnvelope(
              createCompletedValidator,
              completedEnvelope,
            );
            if (!completedValidation.ok) {
              throw new Error(
                `agent.create.completed validation failed: ${completedValidation.errors.join(" | ")}`,
              );
            }

            await client.publishMessage({
              vhost: envCheck.config.vhost,
              exchange: PANTHEON_LIFECYCLE_EXCHANGE,
              routingKey: PANTHEON_EVENT_CREATE_COMPLETED,
              payload: JSON.stringify(completedEnvelope),
            });

            log.info(
              `${formatLifecycleLog({
                stream: "factory",
                event_name: PANTHEON_EVENT_CREATE_COMPLETED,
                operation_id: envelope.operation_id,
                agent_id: envelope.agent_id,
                generation: envelope.generation,
              })} action=published`,
            );
          } catch (err) {
            log.error(`pantheon factory consumer failed to process message: ${String(err)}`);
          }
        }
      } catch (err) {
        log.error(`pantheon factory consumer poll failed: ${String(err)}`);
      }

      if (!stopping) {
        await delay(pollingMs);
      }
    }

    log.info("pantheon factory consumer stopped");
  })();

  return {
    async stop() {
      stopping = true;
      await loopPromise;
    },
  };
}

export const __testOnly = {
  buildCreateCompletedEnvelope,
};
