<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskContent extends Model
{
    public $timestamps = false;
    protected $fillable = ['task_id', 'type', 'body', 'version'];
    protected $casts = [];
}
