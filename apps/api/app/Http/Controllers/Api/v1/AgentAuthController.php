<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\v1\LoginRequest;
use App\Services\AgentAuthService;

class AgentAuthController extends Controller
{
    protected $authService;

    public function __construct(AgentAuthService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Authenticate an agent and return a JWT.
     */
    public function login(LoginRequest $request)
    {
        $token = $this->authService->authenticate($request->id);

        if (!$token) {
            return response()->json(['error' => 'Unauthorized or Inactive Agent'], 401);
        }

        return $this->respondWithToken($token);
    }

    /**
     * Get the authenticated Agent.
     */
    public function me()
    {
        return response()->json($this->authService->getCurrentAgent());
    }

    /**
     * Log the agent out (Invalidate the token).
     */
    public function logout()
    {
        $this->authService->logout();

        return response()->json(['message' => 'Successfully logged out']);
    }

    /**
     * Refresh a token.
     */
    public function refresh()
    {
        return $this->respondWithToken($this->authService->refresh());
    }

    /**
     * Get the token array structure.
     */
    protected function respondWithToken($token)
    {
        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => auth('api')->factory()->getTTL() * 60
        ]);
    }
}
