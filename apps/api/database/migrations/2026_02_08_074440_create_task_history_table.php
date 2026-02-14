<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('task_history', function (Blueprint $table) {
            $table->id();
            $table->uuid('task_id');
            $table->string('from_state')->nullable();
            $table->string('to_state');
            $table->string('agent_id_responsible', 100)->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestampTz('transitioned_at')->useCurrent();

            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->foreign('agent_id_responsible')->references('id')->on('agents');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_history');
    }
};
