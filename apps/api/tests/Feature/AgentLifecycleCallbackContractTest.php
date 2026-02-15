<?php

namespace Tests\Feature;

use App\Services\AgentLifecycleCallbackService;
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

    public function test_callback_returns_stale_flags_when_service_marks_event_as_stale(): void
    {
        $mock = \Mockery::mock(AgentLifecycleCallbackService::class);
        $this->app->instance(AgentLifecycleCallbackService::class, $mock);

        $mock->shouldReceive('isAuthorized')->once()->andReturn(true);
        $mock->shouldReceive('handle')->once()->andReturn([
            'applied' => false,
            'duplicate' => false,
            'stale' => true,
            'operation' => (object) [
                'operation_id' => '11111111-1111-4111-8111-111111111111',
                'state' => 'provisioning',
                'latest_generation' => 3,
                'last_event_name' => 'agent.create.completed',
            ],
        ]);

        $response = $this->postJson('/api/v1/internal/agent-lifecycle/callback', $this->validPayload());

        $response->assertOk();
        $response->assertJson([
            'data' => [
                'operation_id' => '11111111-1111-4111-8111-111111111111',
                'state' => 'provisioning',
                'latest_generation' => 3,
                'last_event_name' => 'agent.create.completed',
                'applied' => false,
                'duplicate' => false,
                'stale' => true,
            ],
        ]);
    }

    public function test_callback_returns_duplicate_flags_when_service_marks_event_as_duplicate(): void
    {
        $mock = \Mockery::mock(AgentLifecycleCallbackService::class);
        $this->app->instance(AgentLifecycleCallbackService::class, $mock);

        $mock->shouldReceive('isAuthorized')->once()->andReturn(true);
        $mock->shouldReceive('handle')->once()->andReturn([
            'applied' => false,
            'duplicate' => true,
            'stale' => false,
            'operation' => (object) [
                'operation_id' => '11111111-1111-4111-8111-111111111111',
                'state' => 'ready',
                'latest_generation' => 5,
                'last_event_name' => 'agent.create.completed',
            ],
        ]);

        $response = $this->postJson('/api/v1/internal/agent-lifecycle/callback', $this->validPayload());

        $response->assertOk();
        $response->assertJson([
            'data' => [
                'operation_id' => '11111111-1111-4111-8111-111111111111',
                'state' => 'ready',
                'latest_generation' => 5,
                'last_event_name' => 'agent.create.completed',
                'applied' => false,
                'duplicate' => true,
                'stale' => false,
            ],
        ]);
    }
}
