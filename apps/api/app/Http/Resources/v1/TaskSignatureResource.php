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
            'signer_agent' => $this->signer_agent,
            'scope' => $this->scope,
            'signature_hash' => $this->signature_hash,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
