<?php

namespace App\Http\Resources\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExecutionLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'agent_id' => $this->agent_id,
            'level' => $this->level,
            'message' => $this->message,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
