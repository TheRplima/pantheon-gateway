<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class StoreAgentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Or auth check if needed
    }

    public function rules(): array
    {
        return [
            'id' => 'required|string|max:100|unique:agents,id',
            'name' => 'required|string|max:255',
            'role' => 'required|string|in:entry,service,orchestrator',
            'capabilities' => 'nullable|array',
            'metadata' => 'nullable|array',
        ];
    }
}
