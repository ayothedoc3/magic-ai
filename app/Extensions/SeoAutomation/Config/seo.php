<?php

return [

    /*
    |--------------------------------------------------------------------------
    | SEO Automation Configuration
    |--------------------------------------------------------------------------
    */

    'enabled' => env('SEO_AUTOMATION_ENABLED', true),

    'claude' => [
        'model' => env('SEO_CLAUDE_MODEL', 'claude-sonnet-4-5-20250929'),
        'max_tokens' => env('SEO_CLAUDE_MAX_TOKENS', 4000),
    ],

    'crawler' => [
        'timeout' => env('SEO_CRAWLER_TIMEOUT', 30),
        'user_agent' => env('SEO_CRAWLER_USER_AGENT', 'Mozilla/5.0 (compatible; SEOBot/1.0)'),
        'max_pages' => env('SEO_CRAWLER_MAX_PAGES', 10),
    ],

    'content' => [
        'min_word_count' => env('SEO_CONTENT_MIN_WORDS', 1500),
        'max_word_count' => env('SEO_CONTENT_MAX_WORDS', 2500),
        'include_faq' => env('SEO_CONTENT_INCLUDE_FAQ', true),
        'include_schema' => env('SEO_CONTENT_INCLUDE_SCHEMA', true),
    ],

    'keywords' => [
        'default_count' => env('SEO_KEYWORDS_DEFAULT_COUNT', 50),
        'max_count' => env('SEO_KEYWORDS_MAX_COUNT', 200),
    ],

    'indexing' => [
        'auto_submit' => env('SEO_AUTO_SUBMIT_TO_GOOGLE', true),
        'check_interval_hours' => env('SEO_INDEXING_CHECK_INTERVAL', 24),
    ],

];
