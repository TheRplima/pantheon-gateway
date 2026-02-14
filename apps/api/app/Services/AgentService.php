<?php

namespace App\Services;

use App\Exceptions\DomainConflictException;
use App\Models\Agent;
use App\Repositories\AgentOperationRepository;
use App\Repositories\AgentRepository;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AgentService
{
    protected $agentRepository;
    protected $operationRepository;

    public function __construct(
        AgentRepository $agentRepository,
        AgentOperationRepository $operationRepository
    ) {
        $this->agentRepository = $agentRepository;
        $this->operationRepository = $operationRepository;
    }

    public function getAllAgents()
    {
        return $this->agentRepository->all();
    }

    public function getById(string $id): Agent
    {
        return $this->agentRepository->findById($id);
    }

    public function createWithOperation(array $data): array
    {
        $operationId = (string) Str::uuid();

        try {
            [$agent, $operation] = DB::transaction(function () use ($data, $operationId) {
                $operation = $this->operationRepository->create([
                    'operation_id' => $operationId,
                    'operation_type' => 'agent.create',
                    'state' => 'pending',
                    'latest_generation' => 0,
                ]);

                $agent = $this->agentRepository->create($data);

                $this->operationRepository->update($operation, [
                    'agent_id' => $agent->id,
                    'state' => 'provisioning',
                ]);

                return [$agent, $operation->fresh()];
            });
        } catch (QueryException $e) {
            if ($e->getCode() === '23505') {
                throw new DomainConflictException('Agent already exists');
            }

            throw $e;
        }

        $this->safeLog('info', 'pantheon.operation.created', [
            'operation_id' => $operation->operation_id,
            'agent_id' => $agent->id,
            'event_name' => 'agent.create.requested',
            'generation' => 0,
        ]);

        return [
            'agent' => $agent,
            'operation' => $operation,
        ];
    }

    public function update(Agent $agent, array $data): Agent
    {
        return $this->agentRepository->update($agent, $data);
    }

    public function delete(Agent $agent): void
    {
        $this->agentRepository->delete($agent);
    }

    public function markInactive(string $id): Agent
    {
        $agent = $this->agentRepository->findById($id);

        return $this->agentRepository->update($agent, ['is_active' => false]);
    }

    public function archive(string $id): Agent
    {
        $agent = $this->agentRepository->findById($id);
        $metadata = array_merge($agent->metadata ?? [], ['archived_at' => now()]);

        return $this->agentRepository->update($agent, [
            'is_active' => false,
            'metadata' => $metadata,
        ]);
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
