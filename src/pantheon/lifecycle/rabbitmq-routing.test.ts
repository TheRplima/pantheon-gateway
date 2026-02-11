import { describe, expect, it } from "vitest";
import {
  PANTHEON_EVENT_ACTIVATED,
  PANTHEON_EVENT_CREATE_COMPLETED,
  PANTHEON_EVENT_CREATE_REQUESTED,
  PANTHEON_EVENT_REGISTERED,
  PANTHEON_LIFECYCLE_EXCHANGE,
  PANTHEON_QUEUE_API_CALLBACK,
  PANTHEON_QUEUE_FACTORY,
  PANTHEON_QUEUE_RUNTIME,
  listPantheonBindingsV1,
  resolvePantheonQueuesForEvent,
} from "./rabbitmq-routing.js";

describe("pantheon rabbitmq routing v1", () => {
  it("maps agent.create.requested to factory queue", () => {
    expect(resolvePantheonQueuesForEvent(PANTHEON_EVENT_CREATE_REQUESTED)).toEqual([PANTHEON_QUEUE_FACTORY]);
  });

  it("maps agent.create.completed to runtime and api callback queues", () => {
    expect(resolvePantheonQueuesForEvent(PANTHEON_EVENT_CREATE_COMPLETED)).toEqual([
      PANTHEON_QUEUE_RUNTIME,
      PANTHEON_QUEUE_API_CALLBACK,
    ]);
  });

  it("maps terminal events to api callback queue", () => {
    expect(resolvePantheonQueuesForEvent(PANTHEON_EVENT_REGISTERED)).toEqual([PANTHEON_QUEUE_API_CALLBACK]);
    expect(resolvePantheonQueuesForEvent(PANTHEON_EVENT_ACTIVATED)).toEqual([PANTHEON_QUEUE_API_CALLBACK]);
  });

  it("exports normalized binding entries", () => {
    const bindings = listPantheonBindingsV1();

    expect(bindings).toEqual(
      expect.arrayContaining([
        {
          exchange: PANTHEON_LIFECYCLE_EXCHANGE,
          queue: PANTHEON_QUEUE_FACTORY,
          routingKey: PANTHEON_EVENT_CREATE_REQUESTED,
        },
        {
          exchange: PANTHEON_LIFECYCLE_EXCHANGE,
          queue: PANTHEON_QUEUE_RUNTIME,
          routingKey: PANTHEON_EVENT_CREATE_COMPLETED,
        },
        {
          exchange: PANTHEON_LIFECYCLE_EXCHANGE,
          queue: PANTHEON_QUEUE_API_CALLBACK,
          routingKey: PANTHEON_EVENT_CREATE_COMPLETED,
        },
      ]),
    );

    const unique = new Set(bindings.map((b) => `${b.exchange}|${b.queue}|${b.routingKey}`));
    expect(unique.size).toBe(bindings.length);
  });
});
