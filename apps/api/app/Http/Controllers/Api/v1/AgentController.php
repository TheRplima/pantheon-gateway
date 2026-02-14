<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\v1\StoreAgentRequest;
use App\Http\Requests\v1\UpdateAgentRequest;
use App\Http\Resources\v1\AgentOperationResource;
use App\Http\Resources\v1\AgentResource;
use App\Services\AgentService;
use Illuminate\Http\Response;

class AgentController extends Controller
{
    protected $agentService;

    public function __construct(AgentService $agentService)
    {
        $this->agentService = $agentService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return AgentResource::collection($this->agentService->getAllAgents());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAgentRequest $request)
    {
        $result = $this->agentService->createWithOperation($request->validated());
        $agent = $result['agent'];
        $operation = $result['operation'];

        return response()->json([
            'data' => (new AgentResource($agent))->resolve(),
            'operation' => (new AgentOperationResource($operation))->resolve(),
        ], Response::HTTP_CREATED)->header('X-Operation-Id', $operation->operation_id);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        return new AgentResource($this->agentService->getById($id));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateAgentRequest $request, $id)
    {
        $agent = $this->agentService->getById($id);
        $updated = $this->agentService->update($agent, $request->validated());

        return new AgentResource($updated);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $agent = $this->agentService->getById($id);
        $this->agentService->delete($agent);

        return response()->noContent();
    }

    /**
     * Mark agent as inactive.
     */
    public function markInactive($id)
    {
        return new AgentResource($this->agentService->markInactive($id));
    }

    /**
     * Archive agent (soft-delete).
     */
    public function softDelete($id)
    {
        $updated = $this->agentService->archive($id);

        return response()->json([
            'message' => 'Agent archived successfully',
            'agent' => new AgentResource($updated),
        ]);
    }
}
