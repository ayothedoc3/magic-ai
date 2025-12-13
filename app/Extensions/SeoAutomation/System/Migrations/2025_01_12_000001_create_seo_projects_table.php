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
        Schema::create('seo_projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('url');
            $table->string('business_type')->nullable();
            $table->string('industry')->nullable();
            $table->string('target_audience')->nullable();
            $table->text('brand_voice')->nullable();
            $table->json('analysis_data')->nullable();
            $table->float('content_quality_score')->default(0);
            $table->integer('keywords_count')->default(0);
            $table->integer('pages_generated')->default(0);
            $table->integer('pages_published')->default(0);
            $table->integer('pages_indexed')->default(0);
            $table->enum('status', ['analyzing', 'ready', 'generating', 'publishing', 'active', 'paused'])->default('analyzing');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('seo_projects');
    }
};
