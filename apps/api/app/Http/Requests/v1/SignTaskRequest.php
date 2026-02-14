<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class SignTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'scope' => 'required|string|in:plan,exec',
            'signature_hash' => 'required|string|max:255',
        ];
    }
}
