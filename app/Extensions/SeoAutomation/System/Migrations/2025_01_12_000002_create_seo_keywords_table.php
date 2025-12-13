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
        Schema::create('seo_keywords', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('seo_projects')->onDelete('cascade');
            $table->string('seed_keyword');
            $table->json('variations')->nullable();
            $table->string('search_intent')->nullable(); // informational, commercial, transactional, navigational
            $table->float('priority_score')->default(0);
            $table->integer('search_volume')->nullable();
            $table->string('difficulty')->nullable(); // easy, medium, hard
            $table->enum('status', ['pending', 'generating', 'generated', 'publishing', 'published', 'failed'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('priority_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seo_keywords');
    }
};
