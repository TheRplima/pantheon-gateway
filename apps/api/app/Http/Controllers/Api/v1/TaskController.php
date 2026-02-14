<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\v1\LogTaskRequest;
use App\Http\Requests\v1\SignTaskRequest;
use App\Http\Requests\v1\StoreTaskRequest;
use App\Http\Requests\v1\SubmitTaskContentRequest;
use App\Http\Requests\v1\UpdateTaskStatusRequest;
use App\Http\Resources\v1\ExecutionLogResource;
use App\Http\Resources\v1\TaskContentResource;
use App\Http\Resources\v1\TaskResource;
use App\Http\Resources\v1\TaskSignatureResource;
use App\Services\TaskService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    protected $taskService;

    public function __construct(TaskService $taskService)
    {
        $this->taskService = $taskService;
    }

    /**
     * List all tasks in the ecosystem.
     */
    public function index()
    {
        $tasks = $this->taskService->getAllTasks();
        return TaskResource::collection($tasks);
    }

    /**
     * List actionable tasks for the authenticated agent.
     */
    public function pending()
    {
        $agentId = Auth::guard('api')->id();
        $tasks = $this->taskService->getPendingTasks($agentId);

        return TaskResource::collection($tasks);
    }

    /**
     * Store a new task (Emission).
     */
    public function store(StoreTaskRequest $request)
    {
        $agentId = Auth::guard('api')->id();
        $task = $this->taskService->emitTask($agentId, $request->validated());

        return new TaskResource($task);
    }

    /**
     * Display the specified task.
     */
    public function show($id)
    {
        $task = $this->taskService->getTaskDetails($id);
        return new TaskResource($task);
    }

    /**
     * Update task status (Transition).
     */
    public function updateStatus(UpdateTaskStatusRequest $request, $id)
    {
        $task = $this->taskService->transitionTask($id, $request->status);
        return new TaskResource($task);
    }

    /**
     * Submit task content (Plan/Report).
     */
    public function submitContent(SubmitTaskContentRequest $request, $id)
    {
        $content = $this->taskService->submitTaskContent($id, $request->type, $request->body);
        return new TaskContentResource($content);
    }

    /**
     * Stream execution log.
     */
    public function log(LogTaskRequest $request, $id)
    {
        $agentId = Auth::guard('api')->id();
        $log = $this->taskService->logExecution($id, $agentId, $request->validated());

        return new ExecutionLogResource($log);
    }

    /**
     * Submit digital signature.
     */
    public function sign(SignTaskRequest $request, $id)
    {
        $agentId = Auth::guard('api')->id();
        $signature = $this->taskService->signTask($id, $agentId, $request->validated());

        return new TaskSignatureResource($signature);
    }
}
