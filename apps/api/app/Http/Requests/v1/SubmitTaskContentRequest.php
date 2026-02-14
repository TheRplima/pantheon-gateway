<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class SubmitTaskContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|string|in:plan,report',
            'body' => 'required|string',
        ];
    }
}
