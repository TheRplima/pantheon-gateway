<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id' => 'required|string|exists:agents,id',
        ];
    }
}
