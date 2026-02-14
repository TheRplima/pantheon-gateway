<?php

namespace App\Repositories;

use App\Models\Task;
use App\Models\TaskContent;
use App\Models\ExecutionLog;
use App\Models\TaskSignature;
use App\Models\TaskValidator;

class TaskRepository
{
    public function all()
    {
        return Task::with(['contents', 'signatures'])->latest()->get();
    }

    public function pendingForAgent(string $agentId)
    {
        return Task::where('owner_agent', $agentId)
            ->whereNotIn('current_state', ['done', 'failed', 'cancelled'])
            ->get();
    }

    public function create(array $data)
    {
        return Task::create($data);
    }

    public function findById(string $id)
    {
        return Task::with(['contents', 'validators', 'signatures'])->findOrFail($id);
    }

    public function updateStatus(Task $task, string $status)
    {
        return $task->update([
            'current_state' => $status,
            'last_transition_at' => now(),
        ]);
    }

    public function addContent(Task $task, string $type, string $body)
    {
        return TaskContent::create([
            'task_id' => $task->id,
            'type' => $type,
            'body' => $body,
            'version' => $task->contents()->where('type', $type)->count() + 1,
        ]);
    }

    public function addLog(string $taskId, string $agentId, string $level, string $message, ?array $metadata = null)
    {
        return ExecutionLog::create([
            'task_id' => $taskId,
            'agent_id' => $agentId,
            'level' => $level,
            'message' => $message,
            'metadata' => $metadata,
        ]);
    }

    public function addSignature(string $taskId, string $agentId, string $scope, string $hash)
    {
        return TaskSignature::create([
            'task_id' => $taskId,
            'signer_agent' => $agentId,
            'scope' => $scope,
            'signature_hash' => $hash,
        ]);
    }

    public function satisfyValidator(string $taskId, string $agentId, string $scope)
    {
        return TaskValidator::where('task_id', $taskId)
            ->where('agent_id', $agentId)
            ->where('required_scope', $scope)
            ->update(['is_satisfied' => true]);
    }
}
