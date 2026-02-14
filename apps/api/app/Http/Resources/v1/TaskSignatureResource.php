<?php

namespace App\Http\Resources\v1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskSignatureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'agent_id' => $this->agent_id,
            'scope' => $this->scope,
            'signature_hash' => $this->signature_hash,
            'signed_at' => $this->signed_at->toIso8601String(),
        ];
    }
}
