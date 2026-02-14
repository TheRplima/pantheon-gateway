<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskSignature extends Model
{
    public $timestamps = false;
    protected $fillable = ['task_id', 'signer_agent', 'scope', 'signature_hash'];
    protected $casts = [];
}
