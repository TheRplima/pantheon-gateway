<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\v1\HandleAgentLifecycleCallbackRequest;
use App\Services\AgentLifecycleCallbackService;
use Symfony\Component\HttpFoundation\Response;

class AgentLifecycleCallbackController extends Controller
{
    protected $callbackService;

    public function __construct(AgentLifecycleCallbackService $callbackService)
    {
        $this->callbackService = $callbackService;
    }

    public function store(HandleAgentLifecycleCallbackRequest $request)
    {
        if (!$this->callbackService->isAuthorized($request)) {
            $this->callbackService->logUnauthorized($request->all());

            return response()->json([
                'error' => [
                    'code' => 'unauthorized',
                    'message' => 'Invalid callback token',
                ],
            ], Response::HTTP_UNAUTHORIZED);
        }

        $result = $this->callbackService->handle($request->validated());

        return response()->json([
            'data' => [
                'operation_id' => $result['operation']->operation_id,
                'state' => $result['operation']->state,
                'latest_generation' => $result['operation']->latest_generation,
                'last_event_name' => $result['operation']->last_event_name,
                'applied' => $result['applied'],
                'duplicate' => $result['duplicate'],
                'stale' => $result['stale'],
            ],
        ]);
    }
}
