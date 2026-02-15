import { randomUUID } from "node:crypto";

type Json = Record<string, unknown>;

type CallbackExpectation = {
  applied: boolean;
  duplicate: boolean;
  stale: boolean;
  generation: number;
};

function fail(message: string): never {
  throw new Error(`[pantheon-callback-smoke] ${message}`);
}

async function readJson(response: Response): Promise<Json> {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as Json;
  } catch {
    fail(`invalid JSON response from ${response.url}: ${text}`);
  }
}

function getString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`missing or invalid ${label}`);
  }
  return value;
}

function getNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    fail(`missing or invalid ${label}`);
  }
  return value;
}

async function sendCallback(
  apiBaseUrl: string,
  callbackHeaders: Record<string, string>,
  operationId: string,
  agentId: string,
  eventName: "agent.create.completed" | "agent.registered" | "agent.activated",
  generation: number,
  expected: CallbackExpectation,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/v1/internal/agent-lifecycle/callback`, {
    method: "POST",
    headers: callbackHeaders,
    body: JSON.stringify({
      event_name: eventName,
      event_version: 1,
      operation_id: operationId,
      occurred_at: new Date().toISOString(),
      producer: "pantheon-callback-smoke",
      agent_id: agentId,
      user_id: "pantheon-smoke-user",
      generation,
      payload: {
        note: `${eventName}:${generation}`,
      },
    }),
  });

  if (response.status !== 200) {
    const body = await response.text();
    fail(`callback ${eventName}@${generation} returned HTTP ${response.status}: ${body}`);
  }

  const callbackJson = await readJson(response);
  const callbackData =
    (callbackJson.data as Json | undefined) ?? fail("callback response.data missing");

  const applied = callbackData.applied;
  const duplicate = callbackData.duplicate;
  const stale = callbackData.stale;
  if (
    applied !== expected.applied ||
    duplicate !== expected.duplicate ||
    stale !== expected.stale
  ) {
    fail(
      `callback ${eventName}@${generation} expected {applied:${expected.applied},duplicate:${expected.duplicate},stale:${expected.stale}} got {applied:${String(
        applied,
      )},duplicate:${String(duplicate)},stale:${String(stale)}}`,
    );
  }

  const latestGeneration = getNumber(
    callbackData.latest_generation,
    `callback ${eventName}@${generation} latest_generation`,
  );
  if (latestGeneration !== expected.generation) {
    fail(
      `callback ${eventName}@${generation} expected latest_generation=${expected.generation}, got ${latestGeneration}`,
    );
  }
}

async function main(): Promise<void> {
  const apiBaseUrl = (process.env.PANTHEON_SMOKE_API_BASE_URL ?? "http://127.0.0.1:9504").replace(
    /\/$/,
    "",
  );
  const callbackToken = process.env.PANTHEON_API_CALLBACK_TOKEN ?? "";

  const agentId = randomUUID();
  const agentName = `Pantheon Callback Smoke ${agentId.slice(0, 8)}`;

  console.log(`[pantheon-callback-smoke] API base URL: ${apiBaseUrl}`);

  const createResponse = await fetch(`${apiBaseUrl}/api/v1/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: agentId,
      name: agentName,
      role: "service",
      capabilities: ["smoke"],
      metadata: {
        smoke: true,
      },
    }),
  });

  if (createResponse.status !== 201) {
    const body = await createResponse.text();
    fail(`POST /api/v1/agents returned HTTP ${createResponse.status}: ${body}`);
  }

  const createJson = await readJson(createResponse);
  const operation =
    (createJson.operation as Json | undefined) ?? fail("response.operation missing");
  const operationId = getString(operation.operation_id, "operation.operation_id");

  const callbackHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (callbackToken.length > 0) {
    callbackHeaders["X-Pantheon-Callback-Token"] = callbackToken;
  }

  await sendCallback(
    apiBaseUrl,
    callbackHeaders,
    operationId,
    agentId,
    "agent.create.completed",
    1,
    {
      applied: true,
      duplicate: false,
      stale: false,
      generation: 1,
    },
  );

  await sendCallback(apiBaseUrl, callbackHeaders, operationId, agentId, "agent.registered", 2, {
    applied: true,
    duplicate: false,
    stale: false,
    generation: 2,
  });

  await sendCallback(apiBaseUrl, callbackHeaders, operationId, agentId, "agent.registered", 2, {
    applied: false,
    duplicate: true,
    stale: false,
    generation: 2,
  });

  await sendCallback(apiBaseUrl, callbackHeaders, operationId, agentId, "agent.activated", 1, {
    applied: false,
    duplicate: false,
    stale: true,
    generation: 2,
  });

  const operationResponse = await fetch(`${apiBaseUrl}/api/v1/agent-operations/${operationId}`);
  if (operationResponse.status !== 200) {
    const body = await operationResponse.text();
    fail(`GET /api/v1/agent-operations/{id} returned HTTP ${operationResponse.status}: ${body}`);
  }

  const operationJson = await readJson(operationResponse);
  const operationData =
    (operationJson.data as Json | undefined) ?? fail("operation response.data missing");
  const finalGeneration = getNumber(
    operationData.latest_generation,
    "operation.data.latest_generation",
  );
  const finalEvent = getString(operationData.last_event_name, "operation.data.last_event_name");

  if (finalGeneration !== 2) {
    fail(`expected final generation=2, got ${finalGeneration}`);
  }

  if (finalEvent !== "agent.registered") {
    fail(`expected final event=agent.registered, got ${finalEvent}`);
  }

  console.log(
    `[pantheon-callback-smoke] PASS operation_id=${operationId} agent_id=${agentId} final_event=${finalEvent} final_generation=${finalGeneration}`,
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
