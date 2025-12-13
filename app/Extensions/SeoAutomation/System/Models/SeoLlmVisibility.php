<?php

namespace App\Extensions\SeoAutomation\System\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeoLlmVisibility extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'seo_llm_visibility';

    protected $fillable = [
        'project_id',
        'page_id',
        'platform',
        'test_prompt',
        'brand_mentioned',
        'url_cited',
        'citation_context',
        'sentiment',
        'visibility_score',
        'checked_at',
    ];

    protected $casts = [
        'brand_mentioned' => 'boolean',
        'url_cited' => 'boolean',
        'visibility_score' => 'float',
        'checked_at' => 'datetime',
    ];

    /**
     * Get the project that owns this visibility record.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(SeoProject::class, 'project_id');
    }

    /**
     * Get the page for this visibility record.
     */
    public function page(): BelongsTo
    {
        return $this->belongsTo(SeoGeneratedPage::class, 'page_id');
    }

    /**
     * Scope by platform.
     */
    public function scopeForPlatform($query, string $platform)
    {
        return $query->where('platform', $platform);
    }

    /**
     * Scope for mentioned records.
     */
    public function scopeMentioned($query)
    {
        return $query->where('brand_mentioned', true);
    }

    /**
     * Scope for cited records.
     */
    public function scopeCited($query)
    {
        return $query->where('url_cited', true);
    }

    /**
     * Get average visibility score for a project and platform.
     */
    public static function getAverageScore(string $projectId, ?string $platform = null): float
    {
        $query = static::where('project_id', $projectId);

        if ($platform) {
            $query->where('platform', $platform);
        }

        return $query->avg('visibility_score') ?? 0;
    }
}
