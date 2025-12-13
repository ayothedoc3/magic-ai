<?php

namespace App\Extensions\SeoAutomation;

use Illuminate\Support\ServiceProvider;

class SeoAutomationServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Register SEO services
        $this->app->singleton(\App\Extensions\SeoAutomation\System\Services\WebsiteAnalyzerService::class);
        $this->app->singleton(\App\Extensions\SeoAutomation\System\Services\KeywordResearchService::class);
        $this->app->singleton(\App\Extensions\SeoAutomation\System\Services\ContentGeneratorService::class);
        $this->app->singleton(\App\Extensions\SeoAutomation\System\Services\PublisherService::class);
        $this->app->singleton(\App\Extensions\SeoAutomation\System\Services\IndexingService::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Load migrations
        $this->loadMigrationsFrom(__DIR__ . '/System/Migrations');

        // Load routes
        $this->loadRoutesFrom(__DIR__ . '/Routes/web.php');
        $this->loadRoutesFrom(__DIR__ . '/Routes/api.php');

        // Load views
        $this->loadViewsFrom(__DIR__ . '/Views', 'seo');

        // Load config
        $this->mergeConfigFrom(__DIR__ . '/Config/seo.php', 'seo');

        // Publish assets if needed
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/Views' => resource_path('views/vendor/seo'),
            ], 'seo-views');
        }
    }
}
