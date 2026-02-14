<?php

namespace App\Services;

use App\Repositories\AgentRepository;
use Illuminate\Support\Facades\Auth;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AgentAuthService
{
    protected $agentRepository;

    public function __construct(AgentRepository $agentRepository)
    {
        $this->agentRepository = $agentRepository;
    }

    public function authenticate(string $id)
    {
        $agent = $this->agentRepository->findActiveById($id);

        if (!$agent) {
            return null;
        }

        // Generate token for the agent
        return Auth::guard('api')->fromUser($agent);
    }

    public function logout()
    {
        Auth::guard('api')->logout();
    }

    public function refresh()
    {
        return Auth::guard('api')->refresh();
    }

    public function getCurrentAgent()
    {
        return Auth::guard('api')->user();
    }
}
