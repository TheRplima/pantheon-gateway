<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExecutionLog extends Model
{
    public $timestamps = false;
    protected $fillable = ['task_id', 'agent_id', 'level', 'message', 'metadata'];
    protected $casts = ['metadata' => 'array'];
}
