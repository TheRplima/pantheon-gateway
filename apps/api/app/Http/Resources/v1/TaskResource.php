<?php

namespace App\Http\Resources\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'current_state' => $this->current_state,
            'requester_agent' => $this->requester_agent,
            'owner_agent' => $this->owner_agent,
            'is_critical' => $this->is_critical,
            'requires_plan_approval' => $this->requires_plan_approval,
            'requires_exec_approval' => $this->requires_exec_approval,
            'priority' => $this->priority,
            'deadline' => $this->deadline ? $this->deadline->toIso8601String() : null,
            'metadata' => $this->metadata,
            'external_id' => $this->external_id,
            'is_recurring' => $this->is_recurring,
            'cron_expression' => $this->cron_expression,
            'parent_task_id' => $this->parent_task_id,
            'created_at' => $this->created_at->toIso8601String(),
            'last_transition_at' => $this->last_transition_at->toIso8601String(),
            // Relations
            'contents' => TaskContentResource::collection($this->whenLoaded('contents')),
            'logs' => ExecutionLogResource::collection($this->whenLoaded('logs')),
            'signatures' => TaskSignatureResource::collection($this->whenLoaded('signatures')),
        ];
    }
}
