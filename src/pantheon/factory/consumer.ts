import { isTruthyEnvValue } from "../../infra/env.js";
import {
  buildAgentCreateRequestedValidator,
  parseEnvelopeJson,
  type PantheonFactoryLog,
  validateAgentCreateRequestedEnvelope,
} from "./agent-create-requested.js";
import { createRabbitManagementApiClient } from "./management-api.js";

const FACTORY_QUEUE = "q.agent.factory";

export type PantheonFactoryConsumerHandle = {
  stop: () => Promise<void>;
};

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

function validateRequiredEnv(env: NodeJS.ProcessEnv):
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

export function startPantheonFactoryConsumer(params: {
  log: PantheonFactoryLog;
  env?: NodeJS.ProcessEnv;
}): PantheonFactoryConsumerHandle | null {
  const env = params.env ?? process.env;
  const { log } = params;

  if (!isPantheonFactoryConsumerEnabled(env)) {
    return null;
  }

  const envCheck = validateRequiredEnv(env);
  if (!envCheck.ok) {
    log.warn(`pantheon factory consumer disabled: ${envCheck.reason}`);
    return null;
  }

  const validator = buildAgentCreateRequestedValidator();
  const pollingMs = resolvePollingIntervalMs(env);
  const client = createRabbitManagementApiClient({
    baseUrl: envCheck.config.apiUrl,
    user: envCheck.config.user,
    pass: envCheck.config.pass,
  });

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
            );
            const validated = validateAgentCreateRequestedEnvelope(validator, envelopeRaw);
            if (!validated.ok) {
              log.warn(
                `pantheon factory consumer rejected message: ${validated.errors.join(" | ")}`,
              );
              continue;
            }

            const envelope = validated.envelope;
            log.info(
              `pantheon factory consumer accepted: operation_id=${envelope.operation_id} agent_id=${envelope.agent_id}`,
            );

            // TODO: invoke workspace rendering/reconciliation pipeline (agent-factory integration).
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
