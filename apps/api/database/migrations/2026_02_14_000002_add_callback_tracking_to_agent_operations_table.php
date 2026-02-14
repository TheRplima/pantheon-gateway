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
        Schema::table('agent_operations', function (Blueprint $table) {
            $table->unsignedInteger('latest_generation')->default(0)->after('state');
            $table->string('last_event_name', 64)->nullable()->after('latest_generation');
            $table->timestampTz('completed_at')->nullable()->after('updated_at');

            $table->index(['operation_id', 'latest_generation']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('agent_operations', function (Blueprint $table) {
            $table->dropIndex(['operation_id', 'latest_generation']);
            $table->dropColumn(['latest_generation', 'last_event_name', 'completed_at']);
        });
    }
};
