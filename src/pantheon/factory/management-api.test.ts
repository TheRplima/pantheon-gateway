import { describe, expect, it, vi } from "vitest";
import { createRabbitManagementApiClient } from "./management-api.js";

describe("pantheon rabbit management api client", () => {
  it("publishes to exchange with expected payload", async () => {
    const fetchImpl = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ routed: true }),
      } as Response;
    });

    const client = createRabbitManagementApiClient({
      baseUrl: "https://rabbitmq.test/api",
      user: "user",
      pass: "pass",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await client.publishMessage({
      vhost: "/pantheon",
      exchange: "pantheon.agent.lifecycle",
      routingKey: "agent.create.completed",
      payload: '{"ok":true}',
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];

    expect(url).toContain("/exchanges/%2Fpantheon/pantheon.agent.lifecycle/publish");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string) as {
      routing_key: string;
      payload_encoding: string;
      payload: string;
    };

    expect(body.routing_key).toBe("agent.create.completed");
    expect(body.payload_encoding).toBe("string");
    expect(body.payload).toBe('{"ok":true}');
  });

  it("throws when publish is not routed", async () => {
    const fetchImpl = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ routed: false }),
      } as Response;
    });

    const client = createRabbitManagementApiClient({
      baseUrl: "https://rabbitmq.test/api",
      user: "user",
      pass: "pass",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.publishMessage({
        vhost: "/pantheon",
        exchange: "pantheon.agent.lifecycle",
        routingKey: "agent.create.completed",
        payload: "{}",
      }),
    ).rejects.toThrow("rabbitmq publish not routed");
  });
});
