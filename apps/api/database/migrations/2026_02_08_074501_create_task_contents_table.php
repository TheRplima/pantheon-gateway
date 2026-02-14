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
        DB::statement("CREATE TYPE content_type AS ENUM ('brief', 'plan', 'report')");

        Schema::create('task_contents', function (Blueprint $table) {
            $table->id();
            $table->uuid('task_id');
            $table->string('type'); // Cast to enum below
            $table->text('body');
            $table->integer('version')->default(1);
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('cascade');
            $table->index(['task_id', 'type']);
        });

        DB::statement("ALTER TABLE task_contents ALTER COLUMN type TYPE content_type USING type::content_type");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_contents');
        DB::statement("DROP TYPE IF EXISTS content_type");
    }
};
