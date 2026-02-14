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
        DB::statement("DROP TYPE IF EXISTS agent_role");
        DB::statement("CREATE TYPE agent_role AS ENUM ('entry', 'service', 'orchestrator')");

        Schema::create('agents', function (Blueprint $table) {
            $table->string('id', 100)->primary();
            $table->string('name');
            $table->string('role'); // Cast to enum below
            $table->boolean('is_active')->default(true);
            $table->jsonb('capabilities')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->timestampTz('last_seen_at')->nullable();
            $table->timestampTz('created_at')->useCurrent();
            $table->timestampTz('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        DB::statement("ALTER TABLE agents ALTER COLUMN role TYPE agent_role USING role::agent_role");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agents');
        DB::statement("DROP TYPE IF EXISTS agent_role");
    }
};
