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
        Schema::create('seo_llm_visibility', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('seo_projects')->onDelete('cascade');
            $table->foreignUuid('page_id')->nullable()->constrained('seo_generated_pages')->onDelete('cascade');
            $table->string('platform'); // chatgpt, claude, perplexity, gemini
            $table->text('test_prompt');
            $table->boolean('brand_mentioned')->default(false);
            $table->boolean('url_cited')->default(false);
            $table->text('citation_context')->nullable();
            $table->string('sentiment')->nullable(); // positive, neutral, negative
            $table->float('visibility_score')->default(0);
            $table->timestamp('checked_at');
            $table->timestamps();

            $table->index(['project_id', 'platform', 'checked_at']);
            $table->index('visibility_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seo_llm_visibility');
    }
};
