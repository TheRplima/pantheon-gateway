<?php

namespace App\Http\Requests\v1;

use Illuminate\Foundation\Http\FormRequest;

class HandleAgentLifecycleCallbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_name' => 'required|string|in:agent.create.completed,agent.registered,agent.activated',
            'event_version' => 'required|integer|in:1',
            'operation_id' => 'required|uuid',
            'occurred_at' => 'required|date',
            'producer' => 'required|string|max:120',
            'agent_id' => 'required|string|max:100',
            'user_id' => 'required|string|max:100',
            'generation' => 'required|integer|min:1',
            'payload' => 'required|array',
        ];
    }
}
