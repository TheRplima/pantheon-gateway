<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'required|string|in:received,planning,plan_pending_approval,ready_for_execution,executing,exec_pending_approval,delivering,done,failed,cancelled',
        ];
    }
}
