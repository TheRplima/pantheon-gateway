export const PANTHEON_RABBITMQ_VHOST = "/pantheon";
export const PANTHEON_LIFECYCLE_EXCHANGE = "pantheon.agent.lifecycle";
export const PANTHEON_DLX_EXCHANGE = "pantheon.agent.dlx";
export const PANTHEON_DLQ_QUEUE = "q.agent.dlq";

export const PANTHEON_QUEUE_FACTORY = "q.agent.factory" as const;
export const PANTHEON_QUEUE_RUNTIME = "q.agent.runtime" as const;
export const PANTHEON_QUEUE_WORKSPACE_MOVE = "q.agent.workspace.move" as const;
export const PANTHEON_QUEUE_API_CALLBACK = "q.agent.api.callback" as const;

export type PantheonQueueName =
  | typeof PANTHEON_QUEUE_FACTORY
  | typeof PANTHEON_QUEUE_RUNTIME
  | typeof PANTHEON_QUEUE_WORKSPACE_MOVE
  | typeof PANTHEON_QUEUE_API_CALLBACK;

export const PANTHEON_EVENT_CREATE_REQUESTED = "agent.create.requested" as const;
export const PANTHEON_EVENT_CREATE_COMPLETED = "agent.create.completed" as const;
export const PANTHEON_EVENT_REGISTERED = "agent.registered" as const;
export const PANTHEON_EVENT_ACTIVATED = "agent.activated" as const;

export type PantheonLifecycleEventNameV1 =
  | typeof PANTHEON_EVENT_CREATE_REQUESTED
  | typeof PANTHEON_EVENT_CREATE_COMPLETED
  | typeof PANTHEON_EVENT_REGISTERED
  | typeof PANTHEON_EVENT_ACTIVATED;

export const PANTHEON_ROUTING_TO_QUEUES_V1: Readonly<Record<PantheonLifecycleEventNameV1, readonly PantheonQueueName[]>> =
  {
    [PANTHEON_EVENT_CREATE_REQUESTED]: [PANTHEON_QUEUE_FACTORY],
    [PANTHEON_EVENT_CREATE_COMPLETED]: [PANTHEON_QUEUE_RUNTIME, PANTHEON_QUEUE_API_CALLBACK],
    [PANTHEON_EVENT_REGISTERED]: [PANTHEON_QUEUE_API_CALLBACK],
    [PANTHEON_EVENT_ACTIVATED]: [PANTHEON_QUEUE_API_CALLBACK],
  } as const;

export const PANTHEON_ALL_QUEUES: readonly PantheonQueueName[] = [
  PANTHEON_QUEUE_FACTORY,
  PANTHEON_QUEUE_RUNTIME,
  PANTHEON_QUEUE_WORKSPACE_MOVE,
  PANTHEON_QUEUE_API_CALLBACK,
];

export function resolvePantheonQueuesForEvent(
  eventName: PantheonLifecycleEventNameV1,
): readonly PantheonQueueName[] {
  return PANTHEON_ROUTING_TO_QUEUES_V1[eventName] ?? [];
}

export function listPantheonBindingsV1(): ReadonlyArray<{
  exchange: string;
  queue: PantheonQueueName;
  routingKey: PantheonLifecycleEventNameV1;
}> {
  const bindings: Array<{ exchange: string; queue: PantheonQueueName; routingKey: PantheonLifecycleEventNameV1 }> =
    [];

  for (const [routingKey, queues] of Object.entries(PANTHEON_ROUTING_TO_QUEUES_V1) as Array<[
    PantheonLifecycleEventNameV1,
    readonly PantheonQueueName[],
  ]>) {
    for (const queue of queues) {
      bindings.push({
        exchange: PANTHEON_LIFECYCLE_EXCHANGE,
        queue,
        routingKey,
      });
    }
  }

  return bindings;
}
