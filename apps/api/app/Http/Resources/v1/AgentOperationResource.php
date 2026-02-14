<?php

namespace App\Http\Resources\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AgentOperationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'operation_id' => $this->operation_id,
            'agent_id' => $this->agent_id,
            'operation_type' => $this->operation_type,
            'state' => $this->state,
            'latest_generation' => $this->latest_generation,
            'last_event_name' => $this->last_event_name,
            'error_code' => $this->error_code,
            'error_message' => $this->error_message,
            'metadata' => $this->metadata,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
