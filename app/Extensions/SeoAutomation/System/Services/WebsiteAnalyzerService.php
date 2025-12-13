<?php

namespace App\Extensions\SeoAutomation\System\Services;

use App\Domains\Entity\Facades\Entity;
use App\Extensions\SeoAutomation\System\Models\SeoProject;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebsiteAnalyzerService
{
    /**
     * Analyze a website and create project.
     */
    public function analyze(string $url, int $userId, ?string $name = null): SeoProject
    {
        // Create project in analyzing state
        $project = SeoProject::create([
            'user_id' => $userId,
            'name' => $name ?? $this->extractDomainName($url),
            'url' => $this->normalizeUrl($url),
            'status' => 'analyzing',
        ]);

        try {
            // Step 1: Crawl the website
            $siteContent = $this->crawlWebsite($project->url);

            // Step 2: Analyze with Claude (using MagicAI's Entity system)
            $analysis = $this->analyzeWithClaude($siteContent, $project->url);

            // Step 3: Update project with analysis
            $project->update([
                'business_type' => $analysis['business_type'] ?? null,
                'industry' => $analysis['industry'] ?? null,
                'target_audience' => $analysis['target_audience'] ?? null,
                'brand_voice' => $analysis['brand_voice'] ?? null,
                'content_quality_score' => $analysis['content_quality_score'] ?? 5.0,
                'analysis_data' => $analysis,
                'status' => 'ready',
            ]);

            Log::info('Website analysis completed', [
                'project_id' => $project->id,
                'url' => $url,
            ]);

            return $project->fresh();
        } catch (\Exception $e) {
            Log::error('Website analysis failed', [
                'project_id' => $project->id,
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            $project->update(['status' => 'failed']);

            throw $e;
        }
    }

    /**
     * Crawl website and extract content.
     */
    private function crawlWebsite(string $url): array
    {
        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (compatible; SEOBot/1.0)',
                ])
                ->get($url);

            if (!$response->successful()) {
                throw new \Exception("Failed to fetch website: {$response->status()}");
            }

            $html = $response->body();

            return [
                'url' => $url,
                'title' => $this->extractTitle($html),
                'meta_description' => $this->extractMetaDescription($html),
                'headings' => $this->extractHeadings($html),
                'body_text' => $this->extractBodyText($html),
                'links' => $this->extractLinks($html, $url),
                'word_count' => str_word_count(strip_tags($html)),
            ];
        } catch (\Exception $e) {
            Log::error('Website crawl failed', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            throw new \Exception("Could not crawl website: {$e->getMessage()}");
        }
    }

    /**
     * Analyze content with Claude using MagicAI's Entity system.
     */
    private function analyzeWithClaude(array $content, string $url): array
    {
        $prompt = $this->buildAnalysisPrompt($content, $url);

        try {
            // Use MagicAI's Entity facade to call Claude
            $response = Entity::driver('claude')
                ->with('model', 'claude-sonnet-4-5-20250929')
                ->with('max_tokens', 4000)
                ->prompt($prompt)
                ->generate();

            // Parse JSON response
            $analysis = json_decode($response, true);

            if (!$analysis) {
                throw new \Exception('Failed to parse Claude response as JSON');
            }

            return $analysis;
        } catch (\Exception $e) {
            Log::error('Claude analysis failed', [
                'url' => $url,
                'error' => $e->getMessage(),
            ]);

            // Return default analysis if Claude fails
            return [
                'business_type' => 'Unknown',
                'industry' => 'General',
                'target_audience' => 'General audience',
                'brand_voice' => 'Professional',
                'content_quality_score' => 5.0,
                'existing_keywords' => [],
                'recommended_strategies' => [],
            ];
        }
    }

    /**
     * Build comprehensive analysis prompt for Claude.
     */
    private function buildAnalysisPrompt(array $content, string $url): string
    {
        $bodyText = substr($content['body_text'] ?? '', 0, 5000); // Limit to 5000 chars
        $headings = implode("\n", array_slice($content['headings'] ?? [], 0, 20));

        return <<<PROMPT
Analyze this website and return a JSON object with detailed SEO insights.

Website URL: {$url}
Title: {$content['title']}
Meta Description: {$content['meta_description']}

Headings:
{$headings}

Content Sample:
{$bodyText}

Word Count: {$content['word_count']}

Return a JSON object with these exact keys:
{
    "business_type": "string (e.g., SaaS, E-commerce, Blog, Service Business, Directory, etc.)",
    "industry": "string (specific industry vertical)",
    "target_audience": "string (detailed audience description)",
    "brand_voice": "string (tone: professional, casual, technical, friendly, etc.)",
    "content_quality_score": float (0-10 rating),
    "existing_keywords": ["array", "of", "obvious", "keywords", "found"],
    "existing_content_types": ["array", "of", "content", "types"],
    "recommended_pseo_strategies": [
        "specific strategy 1",
        "specific strategy 2",
        "specific strategy 3"
    ],
    "competitive_advantages": ["advantage 1", "advantage 2"],
    "content_gaps": ["gap 1", "gap 2", "gap 3"]
}

Return ONLY valid JSON, no markdown formatting or explanations.
PROMPT;
    }

    /**
     * Extract title from HTML.
     */
    private function extractTitle(string $html): string
    {
        if (preg_match('/<title>(.*?)<\/title>/si', $html, $matches)) {
            return trim(strip_tags($matches[1]));
        }

        return 'No title found';
    }

    /**
     * Extract meta description.
     */
    private function extractMetaDescription(string $html): string
    {
        if (preg_match('/<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']/si', $html, $matches)) {
            return trim($matches[1]);
        }

        return '';
    }

    /**
     * Extract all headings (H1-H3).
     */
    private function extractHeadings(string $html): array
    {
        $headings = [];

        if (preg_match_all('/<h[1-3][^>]*>(.*?)<\/h[1-3]>/si', $html, $matches)) {
            $headings = array_map(fn ($h) => trim(strip_tags($h)), $matches[1]);
        }

        return array_filter($headings);
    }

    /**
     * Extract body text.
     */
    private function extractBodyText(string $html): string
    {
        // Remove scripts and styles
        $html = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
        $html = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $html);

        // Get body content
        if (preg_match('/<body[^>]*>(.*?)<\/body>/is', $html, $matches)) {
            $text = strip_tags($matches[1]);
        } else {
            $text = strip_tags($html);
        }

        // Clean up whitespace
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text);
    }

    /**
     * Extract internal links.
     */
    private function extractLinks(string $html, string $baseUrl): array
    {
        $links = [];
        $domain = parse_url($baseUrl, PHP_URL_HOST);

        if (preg_match_all('/<a\s+href=["\'](.*?)["\']/i', $html, $matches)) {
            foreach ($matches[1] as $href) {
                $fullUrl = $this->makeAbsoluteUrl($href, $baseUrl);
                $linkDomain = parse_url($fullUrl, PHP_URL_HOST);

                // Only internal links
                if ($linkDomain === $domain) {
                    $links[] = $fullUrl;
                }
            }
        }

        return array_unique(array_filter($links));
    }

    /**
     * Make URL absolute.
     */
    private function makeAbsoluteUrl(string $url, string $base): string
    {
        if (parse_url($url, PHP_URL_SCHEME) !== null) {
            return $url;
        }

        $baseParts = parse_url($base);
        $scheme = $baseParts['scheme'] ?? 'https';
        $host = $baseParts['host'] ?? '';

        if (strpos($url, '/') === 0) {
            return "{$scheme}://{$host}{$url}";
        }

        return "{$scheme}://{$host}/" . ltrim($url, '/');
    }

    /**
     * Normalize URL.
     */
    private function normalizeUrl(string $url): string
    {
        // Add https if no scheme
        if (!preg_match('/^https?:\/\//i', $url)) {
            $url = 'https://' . $url;
        }

        // Remove trailing slash
        return rtrim($url, '/');
    }

    /**
     * Extract domain name from URL.
     */
    private function extractDomainName(string $url): string
    {
        $host = parse_url($this->normalizeUrl($url), PHP_URL_HOST);

        return str_replace('www.', '', $host ?? '');
    }
}
