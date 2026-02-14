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
        DB::statement("CREATE TYPE signature_scope AS ENUM ('plan', 'exec')");

        Schema::create('task_signatures', function (Blueprint $table) {
            $table->id();
            $table->uuid('task_id');
            $table->string('signer_agent', 100);
            $table->string('scope'); // Cast to enum below
            $table->string('signature_hash', 255);
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
        });

        DB::statement("ALTER TABLE task_signatures ALTER COLUMN scope TYPE signature_scope USING scope::signature_scope");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_signatures');
        DB::statement("DROP TYPE IF EXISTS signature_scope");
    }
};
