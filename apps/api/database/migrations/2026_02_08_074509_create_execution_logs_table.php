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
        DB::statement("CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error', 'critical')");

        Schema::create('execution_logs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->uuid('task_id');
            $table->string('agent_id', 100);
            $table->string('level'); // Cast to enum below
            $table->text('message');
            $table->jsonb('metadata')->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->index('task_id');
        });

        DB::statement("ALTER TABLE execution_logs ALTER COLUMN level TYPE log_level USING level::log_level");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('execution_logs');
        DB::statement("DROP TYPE IF EXISTS log_level");
    }
};
