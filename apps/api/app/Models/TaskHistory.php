<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskHistory extends Model
{
    public $timestamps = false;
    protected $table = 'task_history';
    protected $fillable = ['task_id', 'from_state', 'to_state', 'agent_id_responsible', 'metadata', 'transitioned_at'];
    protected $casts = ['metadata' => 'array', 'transitioned_at' => 'datetime'];
}
