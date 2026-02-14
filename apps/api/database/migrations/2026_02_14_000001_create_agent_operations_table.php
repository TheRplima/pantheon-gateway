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
        Schema::create('agent_operations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('operation_id')->unique();
            $table->string('agent_id', 100)->nullable();
            $table->string('operation_type', 64)->default('agent.create');
            $table->string('state', 32)->default('pending');
            $table->string('error_code', 64)->nullable();
            $table->text('error_message')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestampsTz();

            $table->foreign('agent_id')
                ->references('id')
                ->on('agents')
                ->nullOnDelete();

            $table->index(['agent_id', 'state']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agent_operations');
    }
};

