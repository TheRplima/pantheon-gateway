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
        Schema::create('task_validators', function (Blueprint $table) {
            $table->id();
            $table->uuid('task_id');
            $table->string('agent_id', 100);
            $table->string('required_scope'); // PLAN, EXEC (cast to enum signature_scope)
            $table->boolean('is_satisfied')->default(false);
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->unique(['task_id', 'agent_id', 'required_scope']);
        });

        DB::statement("ALTER TABLE task_validators ALTER COLUMN required_scope TYPE signature_scope USING required_scope::signature_scope");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_validators');
    }
};
