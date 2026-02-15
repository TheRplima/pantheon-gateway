<?php

namespace Tests\Feature;

use Tests\TestCase;

class AgentLifecycleCallbackContractTest extends TestCase
{
    public function test_callback_returns_401_when_token_is_invalid(): void
    {
        $previousToken = env('PANTHEON_API_CALLBACK_TOKEN');
        putenv('PANTHEON_API_CALLBACK_TOKEN=expected-token');
        $_ENV['PANTHEON_API_CALLBACK_TOKEN'] = 'expected-token';
        $_SERVER['PANTHEON_API_CALLBACK_TOKEN'] = 'expected-token';

        try {
            $response = $this->postJson('/api/v1/internal/agent-lifecycle/callback', $this->validPayload(), [
                'X-Pantheon-Callback-Token' => 'wrong-token',
            ]);

            $response->assertStatus(401);
            $response->assertJson([
                'error' => [
                    'code' => 'unauthorized',
                    'message' => 'Invalid callback token',
                ],
            ]);
        } finally {
            $restored = $previousToken === null ? '' : (string) $previousToken;
            putenv('PANTHEON_API_CALLBACK_TOKEN='.$restored);
            $_ENV['PANTHEON_API_CALLBACK_TOKEN'] = $restored;
            $_SERVER['PANTHEON_API_CALLBACK_TOKEN'] = $restored;
        }
    }

    private function validPayload(): array
    {
        return [
            'event_name' => 'agent.create.completed',
            'event_version' => 1,
            'operation_id' => '11111111-1111-4111-8111-111111111111',
            'occurred_at' => now()->toIso8601String(),
            'producer' => 'pantheon.factory',
            'agent_id' => 'agent-001',
            'user_id' => 'user-001',
            'generation' => 1,
            'payload' => [
                'status' => 'ok',
            ],
        ];
    }
}

