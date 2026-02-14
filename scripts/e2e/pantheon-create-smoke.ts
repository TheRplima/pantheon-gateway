import { randomUUID } from "node:crypto";

type Json = Record<string, unknown>;

function fail(message: string): never {
  throw new Error(`[pantheon-smoke] ${message}`);
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

async function main(): Promise<void> {
  const apiBaseUrl = (process.env.PANTHEON_SMOKE_API_BASE_URL ?? "http://127.0.0.1:9504").replace(
    /\/$/,
    "",
  );
  const callbackToken = process.env.PANTHEON_API_CALLBACK_TOKEN ?? "";

  const agentId = randomUUID();
  const operationName = `Pantheon Smoke ${agentId.slice(0, 8)}`;

  console.log(`[pantheon-smoke] API base URL: ${apiBaseUrl}`);

  const createResponse = await fetch(`${apiBaseUrl}/api/v1/agents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: agentId,
      name: operationName,
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
  const operationState = getString(operation.state, "operation.state");

  if (operationState !== "provisioning") {
    fail(`expected initial state=provisioning, got ${operationState}`);
  }

  console.log(
    `[pantheon-smoke] created agent_id=${agentId} operation_id=${operationId} state=${operationState}`,
  );

  const callbackEnvelope = {
    event_name: "agent.create.completed",
    event_version: 1,
    operation_id: operationId,
    occurred_at: new Date().toISOString(),
    producer: "pantheon-smoke",
    agent_id: agentId,
    user_id: "pantheon-smoke-user",
    generation: 1,
    payload: {
      paths: {
        active_workspace_path: `/tmp/pantheon/workspaces/active/${agentId}`,
        disabled_workspace_path: `/tmp/pantheon/workspaces/disabled/${agentId}`,
        current_workspace_path: `/tmp/pantheon/workspaces/active/${agentId}`,
      },
      template: {
        key: "agent-factory-template",
        version: "v2.5",
        checksum: "sha256:smoke-template",
      },
      model: {
        key: "orchestrator",
        version: "2.5.0",
        checksum: "sha256:smoke-model",
      },
      workspace_checks: {
        exists: true,
        bootstrap_files_present: [
          "AGENTS.md",
          "SOUL.md",
          "TOOLS.md",
          "IDENTITY.md",
          "USER.md",
          "HEARTBEAT.md",
          "BOOTSTRAP.md",
        ],
      },
    },
  };

  const callbackHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (callbackToken.length > 0) {
    callbackHeaders["X-Pantheon-Callback-Token"] = callbackToken;
  }

  const callbackResponse = await fetch(`${apiBaseUrl}/api/v1/internal/agent-lifecycle/callback`, {
    method: "POST",
    headers: callbackHeaders,
    body: JSON.stringify(callbackEnvelope),
  });

  if (callbackResponse.status !== 200) {
    const body = await callbackResponse.text();
    fail(
      `POST /api/v1/internal/agent-lifecycle/callback returned HTTP ${callbackResponse.status}: ${body}`,
    );
  }

  const callbackJson = await readJson(callbackResponse);
  const callbackData =
    (callbackJson.data as Json | undefined) ?? fail("callback response.data missing");

  const applied = callbackData.applied;
  if (applied !== true) {
    fail(`expected callback applied=true, got ${String(applied)}`);
  }

  const currentGeneration = getNumber(
    callbackData.latest_generation,
    "callback.data.latest_generation",
  );
  if (currentGeneration !== 1) {
    fail(`expected callback generation=1, got ${currentGeneration}`);
  }

  const operationResponse = await fetch(`${apiBaseUrl}/api/v1/agent-operations/${operationId}`);
  if (operationResponse.status !== 200) {
    const body = await operationResponse.text();
    fail(`GET /api/v1/agent-operations/{id} returned HTTP ${operationResponse.status}: ${body}`);
  }

  const operationJson = await readJson(operationResponse);
  const operationData =
    (operationJson.data as Json | undefined) ?? fail("operation response.data missing");

  const finalState = getString(operationData.state, "operation.data.state");
  if (finalState !== "ready") {
    fail(`expected final state=ready, got ${finalState}`);
  }

  const finalEvent = getString(operationData.last_event_name, "operation.data.last_event_name");
  if (finalEvent !== "agent.create.completed") {
    fail(`expected final event=agent.create.completed, got ${finalEvent}`);
  }

  const finalGeneration = getNumber(
    operationData.latest_generation,
    "operation.data.latest_generation",
  );
  if (finalGeneration !== 1) {
    fail(`expected final generation=1, got ${finalGeneration}`);
  }

  console.log(
    `[pantheon-smoke] PASS operation_id=${operationId} agent_id=${agentId} state=${finalState} event_name=${finalEvent} generation=${finalGeneration}`,
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
