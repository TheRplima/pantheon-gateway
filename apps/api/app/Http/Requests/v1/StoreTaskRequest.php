<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'owner_agent' => 'required|string|exists:agents,id',
            'is_critical' => 'boolean',
            'requires_plan_approval' => 'boolean',
            'requires_exec_approval' => 'boolean',
            'priority' => 'integer|min:1|max:5',
            'deadline' => 'nullable|date',
            'metadata' => 'nullable|array',
            'brief' => 'required|string',
        ];
    }
}
