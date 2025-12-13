<?php

use App\Extensions\SeoAutomation\System\Controllers\SeoController;
use App\Extensions\SeoAutomation\System\Services\WebsiteAnalyzerService;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| SEO Automation Web Routes
|--------------------------------------------------------------------------
*/

// Test routes (only in non-production)
if (!app()->environment('production')) {
    Route::get('/seo/test', function () {
        try {
            $analyzer = app(WebsiteAnalyzerService::class);

            // Get first user or create one
            $user = \App\Models\User::first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'No users found. Please create a user first or run: php artisan db:seed',
                ], 404);
            }

            // Analyze a test website
            $project = $analyzer->analyze('https://shopify.com', $user->id, 'Shopify SEO Test');

            return response()->json([
                'success' => true,
                'message' => 'Website analyzed successfully!',
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'url' => $project->url,
                    'business_type' => $project->business_type,
                    'industry' => $project->industry,
                    'target_audience' => $project->target_audience,
                    'brand_voice' => $project->brand_voice,
                    'content_quality_score' => $project->content_quality_score,
                    'status' => $project->status,
                ],
                'analysis' => $project->analysis_data,
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    })->name('seo.test');
}

// Health check (always available)
Route::get('/seo/health', function () {
    return response()->json([
        'status' => 'ok',
        'extension' => 'SEO Automation',
        'version' => '1.0.0',
        'tables' => [
            'seo_projects' => \Schema::hasTable('seo_projects'),
            'seo_keywords' => \Schema::hasTable('seo_keywords'),
            'seo_generated_pages' => \Schema::hasTable('seo_generated_pages'),
            'seo_indexing_status' => \Schema::hasTable('seo_indexing_status'),
            'seo_llm_visibility' => \Schema::hasTable('seo_llm_visibility'),
        ],
    ]);
})->name('seo.health');

// Protected SEO Dashboard Routes
Route::middleware(['auth'])->prefix('dashboard/seo')->name('seo.')->group(function () {

    // Main Dashboard
    Route::get('/', [SeoController::class, 'dashboard'])->name('dashboard');

    // Projects
    Route::prefix('projects')->name('projects.')->group(function () {
        Route::get('/', [SeoController::class, 'projectsIndex'])->name('index');
        Route::get('/create', [SeoController::class, 'projectsCreate'])->name('create');
        Route::post('/', [SeoController::class, 'projectsStore'])->name('store');
        Route::get('/{project}', [SeoController::class, 'projectsShow'])->name('show');
    });

    // Keywords
    Route::prefix('keywords')->name('keywords.')->group(function () {
        Route::get('/', [SeoController::class, 'keywordsIndex'])->name('index');
    });

    // Content
    Route::prefix('content')->name('content.')->group(function () {
        Route::get('/', [SeoController::class, 'contentIndex'])->name('index');
    });

    // Analytics
    Route::prefix('analytics')->name('analytics.')->group(function () {
        Route::get('/', [SeoController::class, 'analyticsIndex'])->name('index');
    });
});
