import { describe, expect, it } from "vitest";
import { __testOnly, isPantheonApiCallbackConsumerEnabled } from "./consumer.js";

describe("pantheon api callback consumer env gate", () => {
  it("is disabled by default", () => {
    expect(isPantheonApiCallbackConsumerEnabled({})).toBe(false);
  });

  it("is enabled when flag is truthy", () => {
    expect(
      isPantheonApiCallbackConsumerEnabled({ PANTHEON_API_CALLBACK_CONSUMER_ENABLED: "1" }),
    ).toBe(true);
  });
});

describe("pantheon api callback consumer helpers", () => {
  it("validates required env", () => {
    const result = __testOnly.validateRequiredEnv({
      RABBITMQ_API_URL: "http://localhost:15672/api",
      RABBITMQ_USER: "guest",
      RABBITMQ_PASS: "guest",
      PANTHEON_API_CALLBACK_URL: "http://localhost:9504/api/v1/internal/agent-lifecycle/callback",
    });

    expect(result.ok).toBe(true);
  });

  it("normalizes supported callback events", () => {
    expect(__testOnly.asCallbackEventName("agent.create.completed")).toBe("agent.create.completed");
    expect(__testOnly.asCallbackEventName("agent.create.requested")).toBe(null);
  });
});
