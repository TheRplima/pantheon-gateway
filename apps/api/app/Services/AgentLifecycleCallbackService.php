<?php

namespace App\Services;

use App\Models\AgentOperation;
use App\Repositories\AgentOperationRepository;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AgentLifecycleCallbackService
{
    protected $operationRepository;

    public function __construct(AgentOperationRepository $operationRepository)
    {
        $this->operationRepository = $operationRepository;
    }

    public function isAuthorized(Request $request): bool
    {
        $expectedToken = (string) env('PANTHEON_API_CALLBACK_TOKEN', '');
        if ($expectedToken === '') {
            return true;
        }

        $providedToken = (string) $request->header('X-Pantheon-Callback-Token', '');

        return hash_equals($expectedToken, $providedToken);
    }

    public function handle(array $validated): array
    {
        return DB::transaction(function () use ($validated) {
            $operation = $this->operationRepository->lockByOperationIdOrFail($validated['operation_id']);

            $incomingGeneration = (int) $validated['generation'];
            $knownGeneration = (int) ($operation->latest_generation ?? 0);
            $eventName = (string) $validated['event_name'];

            if ($incomingGeneration < $knownGeneration) {
                $this->safeLog('warning', 'pantheon.callback.stale_generation', [
                    'operation_id' => $operation->operation_id,
                    'agent_id' => $operation->agent_id,
                    'user_id' => $validated['user_id'],
                    'event_name' => $eventName,
                    'generation' => $incomingGeneration,
                    'known_generation' => $knownGeneration,
                ]);

                return [
                    'applied' => false,
                    'duplicate' => false,
                    'stale' => true,
                    'operation' => $operation,
                ];
            }

            if ($incomingGeneration === $knownGeneration && $operation->last_event_name === $eventName) {
                $this->safeLog('info', 'pantheon.callback.duplicate_event', [
                    'operation_id' => $operation->operation_id,
                    'agent_id' => $operation->agent_id,
                    'user_id' => $validated['user_id'],
                    'event_name' => $eventName,
                    'generation' => $incomingGeneration,
                ]);

                return [
                    'applied' => false,
                    'duplicate' => true,
                    'stale' => false,
                    'operation' => $operation,
                ];
            }

            $this->applyOperationEvent($operation, $validated, $eventName, $incomingGeneration);

            $this->safeLog('info', 'pantheon.callback.applied', [
                'operation_id' => $operation->operation_id,
                'agent_id' => $operation->agent_id,
                'user_id' => $validated['user_id'],
                'event_name' => $eventName,
                'generation' => $incomingGeneration,
            ]);

            return [
                'applied' => true,
                'duplicate' => false,
                'stale' => false,
                'operation' => $operation,
            ];
        });
    }

    public function logUnauthorized(array $input): void
    {
        $this->safeLog('warning', 'pantheon.callback.unauthorized', [
            'operation_id' => $input['operation_id'] ?? null,
            'agent_id' => $input['agent_id'] ?? null,
            'event_name' => $input['event_name'] ?? null,
            'generation' => $input['generation'] ?? null,
        ]);
    }

    private function applyOperationEvent(AgentOperation $operation, array $validated, string $eventName, int $incomingGeneration): void
    {
        $metadata = is_array($operation->metadata) ? $operation->metadata : [];
        $metadata['last_event'] = [
            'event_name' => $eventName,
            'event_version' => $validated['event_version'],
            'occurred_at' => $validated['occurred_at'],
            'producer' => $validated['producer'],
            'generation' => $incomingGeneration,
        ];

        $operation->fill([
            'state' => $this->resolveStateFromEvent($eventName),
            'latest_generation' => $incomingGeneration,
            'last_event_name' => $eventName,
            'metadata' => $metadata,
        ]);

        if ($eventName === 'agent.create.completed' && $operation->completed_at === null) {
            $operation->completed_at = now();
        }

        $this->operationRepository->save($operation);
    }

    private function resolveStateFromEvent(string $eventName): string
    {
        return match ($eventName) {
            'agent.create.completed', 'agent.registered', 'agent.activated' => 'ready',
            default => 'error',
        };
    }

    private function safeLog(string $level, string $message, array $context = []): void
    {
        try {
            Log::{$level}($message, $context);
        } catch (\Throwable) {
            // Logging must never break API contracts.
        }
    }
}
