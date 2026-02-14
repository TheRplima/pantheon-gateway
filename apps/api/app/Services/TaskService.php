<?php

namespace App\Services;

use App\Repositories\TaskRepository;
use Illuminate\Support\Facades\DB;

class TaskService
{
    protected $repository;

    public function __construct(TaskRepository $repository)
    {
        $this->repository = $repository;
    }

    public function getAllTasks()
    {
        return $this->repository->all();
    }

    public function getPendingTasks(string $agentId)
    {
        return $this->repository->pendingForAgent($agentId);
    }

    public function emitTask(string $requesterId, array $data)
    {
        return DB::transaction(function () use ($requesterId, $data) {
            $taskData = [
                'title' => $data['title'],
                'requester_agent' => $requesterId,
                'owner_agent' => $data['owner_agent'],
                'is_critical' => $data['is_critical'] ?? false,
                'requires_plan_approval' => $data['requires_plan_approval'] ?? false,
                'requires_exec_approval' => $data['requires_exec_approval'] ?? false,
                'priority' => $data['priority'] ?? 3,
                'deadline' => $data['deadline'] ?? null,
                'metadata' => $data['metadata'] ?? null,
                'current_state' => 'received',
            ];

            $task = $this->repository->create($taskData);

            $this->repository->addContent($task, 'brief', $data['brief']);

            return $task;
        });
    }

    public function getTaskDetails(string $id)
    {
        return $this->repository->findById($id);
    }

    public function transitionTask(string $id, string $status)
    {
        $task = $this->repository->findById($id);
        
        // TODO: Governance validation logic (ADR alignment)
        
        return $this->repository->updateStatus($task, $status);
    }

    public function submitTaskContent(string $id, string $type, string $body)
    {
        $task = $this->repository->findById($id);
        return $this->repository->addContent($task, $type, $body);
    }

    public function logExecution(string $id, string $agentId, array $logData)
    {
        return $this->repository->addLog(
            $id,
            $agentId,
            $logData['level'],
            $logData['message'],
            $logData['metadata'] ?? null
        );
    }

    public function signTask(string $id, string $agentId, array $signatureData)
    {
        return DB::transaction(function () use ($id, $agentId, $signatureData) {
            $signature = $this->repository->addSignature(
                $id,
                $agentId,
                $signatureData['scope'],
                $signatureData['signature_hash']
            );

            $this->repository->satisfyValidator($id, $agentId, $signatureData['scope']);

            return $signature;
        });
    }
}
