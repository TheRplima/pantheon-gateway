<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\v1\StoreAgentRequest;
use App\Http\Requests\v1\UpdateAgentRequest;
use App\Http\Resources\v1\AgentResource;
use App\Models\Agent;
use App\Repositories\AgentRepository;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

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
        $agent = $this->repository->create($request->validated());
    
        return new AgentResource($agent);
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
