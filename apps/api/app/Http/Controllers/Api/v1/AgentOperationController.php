<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Resources\v1\AgentOperationResource;
use App\Models\AgentOperation;

class AgentOperationController extends Controller
{
    public function show(string $operationId)
    {
        $operation = AgentOperation::where('operation_id', $operationId)->firstOrFail();

        return new AgentOperationResource($operation);
    }
}

