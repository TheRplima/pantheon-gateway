<?php

namespace App\Repositories;

use App\Models\AgentOperation;

class AgentOperationRepository
{
    public function create(array $data): AgentOperation
    {
        return AgentOperation::create($data);
    }

    public function findByOperationId(string $operationId): ?AgentOperation
    {
        return AgentOperation::query()
            ->where('operation_id', $operationId)
            ->first();
    }

    public function findByOperationIdOrFail(string $operationId): AgentOperation
    {
        return AgentOperation::query()
            ->where('operation_id', $operationId)
            ->firstOrFail();
    }

    public function lockByOperationIdOrFail(string $operationId): AgentOperation
    {
        return AgentOperation::query()
            ->where('operation_id', $operationId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    public function update(AgentOperation $operation, array $data): AgentOperation
    {
        $operation->update($data);

        return $operation;
    }

    public function save(AgentOperation $operation): AgentOperation
    {
        $operation->save();

        return $operation;
    }
}
