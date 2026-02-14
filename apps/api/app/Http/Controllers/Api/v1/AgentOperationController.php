<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Resources\v1\AgentOperationResource;
use App\Services\AgentOperationService;

class AgentOperationController extends Controller
{
    protected $agentOperationService;

    public function __construct(AgentOperationService $agentOperationService)
    {
        $this->agentOperationService = $agentOperationService;
    }

    public function show(string $operationId)
    {
        $operation = $this->agentOperationService->getByOperationId($operationId);

        return new AgentOperationResource($operation);
    }
}
