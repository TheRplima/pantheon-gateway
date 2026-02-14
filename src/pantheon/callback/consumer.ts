import { isTruthyEnvValue } from "../../infra/env.js";
import { parseEnvelopeJson, type PantheonFactoryLog } from "../factory/agent-create-requested.js";
import { createRabbitManagementApiClient } from "../factory/management-api.js";
import { PANTHEON_QUEUE_API_CALLBACK } from "../lifecycle/rabbitmq-routing.js";
import {
  buildLifecycleCallbackValidator,
  PANTHEON_CALLBACK_EVENT_NAMES,
  validateLifecycleCallbackEnvelope,
  type PantheonCallbackEventName,
} from "./agent-lifecycle-callback.js";

const API_CALLBACK_QUEUE = PANTHEON_QUEUE_API_CALLBACK;

export type PantheonApiCallbackConsumerHandle = {
  stop: () => Promise<void>;
};

export type PantheonApiCallbackConsumerDeps = {
  fetchImpl: typeof fetch;
};

function defaultDeps(): PantheonApiCallbackConsumerDeps {
  return {
    fetchImpl: fetch,
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

function asCallbackEventName(eventName: string): PantheonCallbackEventName | null {
  if ((PANTHEON_CALLBACK_EVENT_NAMES as readonly string[]).includes(eventName)) {
    return eventName as PantheonCallbackEventName;
  }
  return null;
}

export function isPantheonApiCallbackConsumerEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isTruthyEnvValue(env.PANTHEON_API_CALLBACK_CONSUMER_ENABLED);
}

function resolvePollingIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env.PANTHEON_API_CALLBACK_POLL_MS ?? "2000", 10);
  if (Number.isNaN(parsed) || parsed < 250) {
    return 2000;
  }
  return parsed;
}

function validateRequiredEnv(env: NodeJS.ProcessEnv):
  | {
      ok: true;
      config: {
        rabbitApiUrl: string;
        rabbitUser: string;
        rabbitPass: string;
        rabbitVhost: string;
        callbackUrl: string;
        callbackToken: string;
      };
    }
  | { ok: false; reason: string } {
  const rabbitApiUrl = env.RABBITMQ_API_URL?.trim();
  const rabbitUser = env.RABBITMQ_USER?.trim();
  const rabbitPass = env.RABBITMQ_PASS ?? "";
  const rabbitVhost = env.RABBITMQ_VHOST?.trim() || "/pantheon";
  const callbackUrl = env.PANTHEON_API_CALLBACK_URL?.trim();
  const callbackToken = env.PANTHEON_API_CALLBACK_TOKEN?.trim() || "";

  if (!rabbitApiUrl) {
    return { ok: false, reason: "RABBITMQ_API_URL not set" };
  }
  if (!rabbitUser) {
    return { ok: false, reason: "RABBITMQ_USER not set" };
  }
  if (!rabbitPass) {
    return { ok: false, reason: "RABBITMQ_PASS not set" };
  }
  if (!callbackUrl) {
    return { ok: false, reason: "PANTHEON_API_CALLBACK_URL not set" };
  }

  return {
    ok: true,
    config: {
      rabbitApiUrl,
      rabbitUser,
      rabbitPass,
      rabbitVhost,
      callbackUrl,
      callbackToken,
    },
  };
}

export function startPantheonApiCallbackConsumer(params: {
  log: PantheonFactoryLog;
  env?: NodeJS.ProcessEnv;
  deps?: Partial<PantheonApiCallbackConsumerDeps>;
}): PantheonApiCallbackConsumerHandle | null {
  const env = params.env ?? process.env;
  const { log } = params;
  const deps = { ...defaultDeps(), ...params.deps };

  if (!isPantheonApiCallbackConsumerEnabled(env)) {
    return null;
  }

  const envCheck = validateRequiredEnv(env);
  if (!envCheck.ok) {
    log.warn(`pantheon api callback consumer disabled: ${envCheck.reason}`);
    return null;
  }

  const pollingMs = resolvePollingIntervalMs(env);
  const client = createRabbitManagementApiClient({
    baseUrl: envCheck.config.rabbitApiUrl,
    user: envCheck.config.rabbitUser,
    pass: envCheck.config.rabbitPass,
  });

  const validators = {
    "agent.create.completed": buildLifecycleCallbackValidator({
      eventName: "agent.create.completed",
    }),
    "agent.registered": buildLifecycleCallbackValidator({ eventName: "agent.registered" }),
    "agent.activated": buildLifecycleCallbackValidator({ eventName: "agent.activated" }),
  };

  let stopping = false;
  const loopPromise = (async () => {
    log.info(
      `pantheon api callback consumer started: queue=${API_CALLBACK_QUEUE} vhost=${envCheck.config.rabbitVhost} pollMs=${pollingMs}`,
    );

    while (!stopping) {
      try {
        const messages = await client.getMessages({
          vhost: envCheck.config.rabbitVhost,
          queue: API_CALLBACK_QUEUE,
          count: 10,
        });

        for (const message of messages) {
          try {
            const envelopeRaw = parseEnvelopeJson(
              decodePayloadAsString(message.payload, message.payload_encoding),
            ) as {
              event_name?: string;
              operation_id?: string;
              agent_id?: string;
              generation?: number;
            };

            const eventName =
              typeof envelopeRaw.event_name === "string"
                ? asCallbackEventName(envelopeRaw.event_name)
                : null;
            if (!eventName) {
              log.warn(
                `pantheon api callback consumer rejected unsupported event: ${String(envelopeRaw.event_name ?? "<missing>")}`,
              );
              continue;
            }

            const validated = validateLifecycleCallbackEnvelope(validators[eventName], envelopeRaw);
            if (!validated.ok) {
              log.warn(
                `pantheon api callback consumer rejected ${eventName}: ${validated.errors.join(" | ")}`,
              );
              continue;
            }

            const headers: Record<string, string> = {
              "Content-Type": "application/json",
            };
            if (envCheck.config.callbackToken.length > 0) {
              headers["X-Pantheon-Callback-Token"] = envCheck.config.callbackToken;
            }

            const response = await deps.fetchImpl(envCheck.config.callbackUrl, {
              method: "POST",
              headers,
              body: JSON.stringify(validated.envelope),
            });

            if (!response.ok) {
              const body = await response.text().catch(() => "");
              throw new Error(`callback API failed: HTTP ${response.status} ${body}`.trim());
            }

            log.info(
              `pantheon api callback consumer delivered ${eventName}: operation_id=${validated.envelope.operation_id} agent_id=${validated.envelope.agent_id} generation=${validated.envelope.generation}`,
            );
          } catch (err) {
            log.error(`pantheon api callback consumer failed to process message: ${String(err)}`);
          }
        }
      } catch (err) {
        log.error(`pantheon api callback consumer poll failed: ${String(err)}`);
      }

      if (!stopping) {
        await delay(pollingMs);
      }
    }

    log.info("pantheon api callback consumer stopped");
  })();

  return {
    async stop() {
      stopping = true;
      await loopPromise;
    },
  };
}

export const __testOnly = {
  asCallbackEventName,
  validateRequiredEnv,
};
