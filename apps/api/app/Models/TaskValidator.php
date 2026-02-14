<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskValidator extends Model
{
    public $timestamps = false;
    protected $fillable = ['task_id', 'agent_id', 'required_scope', 'is_satisfied'];
    protected $casts = ['is_satisfied' => 'boolean'];
}
