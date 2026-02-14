<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class LogTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'level' => 'required|string|in:debug,info,warn,error,critical',
            'message' => 'required|string',
            'metadata' => 'nullable|array',
        ];
    }
}
