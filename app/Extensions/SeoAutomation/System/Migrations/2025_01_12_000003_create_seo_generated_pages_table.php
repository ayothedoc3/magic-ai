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
        Schema::create('seo_generated_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('keyword_id')->constrained('seo_keywords')->onDelete('cascade');
            $table->foreignUuid('project_id')->constrained('seo_projects')->onDelete('cascade');
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('meta_description');
            $table->longText('content_html');
            $table->longText('content_markdown')->nullable();
            $table->json('schema_markup')->nullable();
            $table->json('internal_links')->nullable();
            $table->integer('word_count')->default(0);
            $table->string('published_url')->nullable();
            $table->integer('cms_post_id')->nullable();
            $table->float('llm_visibility_score')->default(0);
            $table->enum('status', ['draft', 'reviewing', 'approved', 'publishing', 'published', 'failed'])->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['project_id', 'status']);
            $table->index('published_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seo_generated_pages');
    }
};
