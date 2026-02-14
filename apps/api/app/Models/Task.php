<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Task extends Model
{
    use HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'current_state',
        'requester_agent',
        'owner_agent',
        'is_critical',
        'requires_plan_approval',
        'requires_exec_approval',
        'priority',
        'deadline',
        'metadata',
        'external_id',
        'is_recurring',
        'cron_expression',
        'parent_task_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_critical' => 'boolean',
        'requires_plan_approval' => 'boolean',
        'requires_exec_approval' => 'boolean',
        'metadata' => 'array',
        'is_recurring' => 'boolean',
        'deadline' => 'datetime',
        'last_transition_at' => 'datetime',
    ];

    /**
     * Indicates if the model should be timestamped.
     * We use created_at but custom updated_at (last_transition_at)
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * Get the requester agent.
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'requester_agent');
    }

    /**
     * Get the owner agent.
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(Agent::class, 'owner_agent');
    }

    /**
     * Get history for this task.
     */
    public function history(): HasMany
    {
        return $this->hasMany(TaskHistory::class);
    }

    /**
     * Get contents for this task.
     */
    public function contents(): HasMany
    {
        return $this->hasMany(TaskContent::class);
    }

    /**
     * Get execution logs for this task.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(ExecutionLog::class);
    }

    /**
     * Get signatures for this task.
     */
    public function signatures(): HasMany
    {
        return $this->hasMany(TaskSignature::class);
    }

    /**
     * Get validators for this task.
     */
    public function validators(): HasMany
    {
        return $this->hasMany(TaskValidator::class);
    }
}
