<?php

namespace App\Http\Controllers\Api\v1;

use App\Exceptions\DomainConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\v1\StoreAgentRequest;
use App\Http\Requests\v1\UpdateAgentRequest;
use App\Http\Resources\v1\AgentOperationResource;
use App\Http\Resources\v1\AgentResource;
use App\Models\AgentOperation;
use App\Models\Agent;
use App\Repositories\AgentRepository;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class AgentController extends Controller
{
    protected $repository;

    public function __construct(AgentRepository $repository)
    {
        $this->repository = $repository;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return AgentResource::collection($this->repository->all());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAgentRequest $request)
    {
        $operationId = (string) Str::uuid();

        try {
            [$agent, $operation] = DB::transaction(function () use ($request, $operationId) {
                $operation = AgentOperation::create([
                    'operation_id' => $operationId,
                    'operation_type' => 'agent.create',
                    'state' => 'pending',
                    'latest_generation' => 0,
                ]);

                $agent = $this->repository->create($request->validated());

                $operation->update([
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

        return response()->json([
            'data' => (new AgentResource($agent))->resolve(),
            'operation' => (new AgentOperationResource($operation))->resolve(),
        ], Response::HTTP_CREATED)->header('X-Operation-Id', $operation->operation_id);
    }

    private function safeLog(string $level, string $message, array $context = []): void
    {
        try {
            Log::{$level}($message, $context);
        } catch (\Throwable) {
            // Logging must never break API contracts.
        }
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $agent = $this->repository->findById($id);
        return new AgentResource($agent);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAgentRequest $request, $id)
    {
        $agent = $this->repository->findById($id);
        $updated = $this->repository->update($agent, $request->validated());
        
        return new AgentResource($updated);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $agent = $this->repository->findById($id);
        $this->repository->delete($agent);
        return response()->noContent();
    }

    /**
     * Mark agent as inactive.
     */
    public function markInactive($id)
    {
        $agent = $this->repository->findById($id);
        $updated = $this->repository->update($agent, ['is_active' => false]);
        return new AgentResource($updated);
    }

    /**
     * Archive agent (soft-delete).
     */
    public function softDelete($id)
    {
        $agent = $this->repository->findById($id);
        $metadata = array_merge($agent->metadata ?? [], ['archived_at' => now()]);
        $updated = $this->repository->update($agent, ['is_active' => false, 'metadata' => $metadata]);
        
        return response()->json(['message' => 'Agent archived successfully', 'agent' => new AgentResource($updated)]);
    }
}
