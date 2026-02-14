<?php

namespace App\Services;

use App\Models\AgentOperation;
use App\Repositories\AgentOperationRepository;

class AgentOperationService
{
    protected $operationRepository;

    public function __construct(AgentOperationRepository $operationRepository)
    {
        $this->operationRepository = $operationRepository;
    }

    public function getByOperationId(string $operationId): AgentOperation
    {
        return $this->operationRepository->findByOperationIdOrFail($operationId);
    }
}
