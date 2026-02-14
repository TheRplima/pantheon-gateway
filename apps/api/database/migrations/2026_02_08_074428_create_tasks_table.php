<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("DROP TYPE IF EXISTS task_state");
        DB::statement("CREATE TYPE task_state AS ENUM (
            'received', 'planning', 'plan_pending_approval', 'ready_for_execution', 
            'executing', 'exec_pending_approval', 'delivering', 'done', 'failed', 'cancelled'
        )");

        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->string('title');
            $table->string('current_state'); // We created the type, but laravel doesn't have a native 'enum' that maps to a pre-existing PG type easily without raw SQL
            $table->string('requester_agent', 100);
            $table->string('owner_agent', 100);
            $table->boolean('is_critical')->default(false);
            $table->boolean('requires_plan_approval')->default(false);
            $table->boolean('requires_exec_approval')->default(false);
            $table->integer('priority')->default(3);
            $table->timestampTz('deadline')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->string('external_id', 100)->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->string('cron_expression', 100)->nullable();
            $table->uuid('parent_task_id')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('last_transition_at')->useCurrent();
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->foreign('requester_agent')->references('id')->on('agents');
            $table->foreign('owner_agent')->references('id')->on('agents');
            $table->foreign('parent_task_id')->references('id')->on('tasks');
        });

        // Cast to our enum type
        DB::statement("ALTER TABLE tasks ALTER COLUMN current_state TYPE task_state USING current_state::task_state");
        DB::statement("ALTER TABLE tasks ALTER COLUMN current_state SET DEFAULT 'received'");
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
        DB::statement("DROP TYPE IF EXISTS task_state");
    }
};
