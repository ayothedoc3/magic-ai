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
        Schema::create('seo_indexing_status', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('page_id')->constrained('seo_generated_pages')->onDelete('cascade');
            $table->boolean('google_indexed')->default(false);
            $table->boolean('submitted_to_google')->default(false);
            $table->timestamp('last_crawled')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->json('indexing_issues')->nullable();
            $table->integer('ranking_position')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->index(['page_id', 'google_indexed']);
            $table->index('checked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seo_indexing_status');
    }
};
