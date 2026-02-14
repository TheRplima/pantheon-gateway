<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\v1\HandleAgentLifecycleCallbackRequest;
use App\Models\AgentOperation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AgentLifecycleCallbackController extends Controller
{
    public function store(HandleAgentLifecycleCallbackRequest $request)
    {
        if (!$this->isAuthorized($request)) {
            $this->safeLog('warning', 'pantheon.callback.unauthorized', [
                'operation_id' => $request->input('operation_id'),
                'agent_id' => $request->input('agent_id'),
                'event_name' => $request->input('event_name'),
                'generation' => $request->input('generation'),
            ]);

            return response()->json([
                'error' => [
                    'code' => 'unauthorized',
                    'message' => 'Invalid callback token',
                ],
            ], Response::HTTP_UNAUTHORIZED);
        }

        $validated = $request->validated();

        $result = DB::transaction(function () use ($validated) {
            /** @var AgentOperation $operation */
            $operation = AgentOperation::query()
                ->where('operation_id', $validated['operation_id'])
                ->lockForUpdate()
                ->firstOrFail();

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

            $operation->save();

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

        return response()->json([
            'data' => [
                'operation_id' => $result['operation']->operation_id,
                'state' => $result['operation']->state,
                'latest_generation' => $result['operation']->latest_generation,
                'last_event_name' => $result['operation']->last_event_name,
                'applied' => $result['applied'],
                'duplicate' => $result['duplicate'],
                'stale' => $result['stale'],
            ],
        ]);
    }

    private function isAuthorized(Request $request): bool
    {
        $expectedToken = (string) env('PANTHEON_API_CALLBACK_TOKEN', '');
        if ($expectedToken === '') {
            return true;
        }

        $providedToken = (string) $request->header('X-Pantheon-Callback-Token', '');

        return hash_equals($expectedToken, $providedToken);
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
