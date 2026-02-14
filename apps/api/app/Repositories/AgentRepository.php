<?php

namespace App\Repositories;

use App\Models\Agent;

class AgentRepository
{
    public function all()
    {
        return Agent::all();
    }

    public function findById(string $id)
    {
        return Agent::findOrFail($id);
    }

    public function findActiveById(string $id): ?Agent
    {
        return Agent::where('id', $id)
            ->where('is_active', true)
            ->first();
    }

    public function create(array $data)
    {
        return Agent::create($data);
    }

    public function update(Agent $agent, array $data)
    {
        $agent->update($data);
        return $agent;
    }

    public function delete(Agent $agent)
    {
        return $agent->delete();
    }
}
