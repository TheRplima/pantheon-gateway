<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAgentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:255',
            'role' => 'sometimes|string|in:entry,service,orchestrator',
            'is_active' => 'sometimes|boolean',
            'capabilities' => 'sometimes|array',
            'metadata' => 'sometimes|array',
        ];
    }
}
