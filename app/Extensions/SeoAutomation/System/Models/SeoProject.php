<?php

namespace App\Extensions\SeoAutomation\System\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SeoProject extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'seo_projects';

    protected $fillable = [
        'user_id',
        'name',
        'url',
        'business_type',
        'industry',
        'target_audience',
        'brand_voice',
        'analysis_data',
        'content_quality_score',
        'keywords_count',
        'pages_generated',
        'pages_published',
        'pages_indexed',
        'status',
    ];

    protected $casts = [
        'analysis_data' => 'array',
        'content_quality_score' => 'float',
        'keywords_count' => 'integer',
        'pages_generated' => 'integer',
        'pages_published' => 'integer',
        'pages_indexed' => 'integer',
    ];

    /**
     * Get the user that owns the project.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all keywords for this project.
     */
    public function keywords(): HasMany
    {
        return $this->hasMany(SeoKeyword::class, 'project_id');
    }

    /**
     * Get all generated pages for this project.
     */
    public function generatedPages(): HasMany
    {
        return $this->hasMany(SeoGeneratedPage::class, 'project_id');
    }

    /**
     * Get LLM visibility records for this project.
     */
    public function llmVisibility(): HasMany
    {
        return $this->hasMany(SeoLlmVisibility::class, 'project_id');
    }

    /**
     * Scope for active projects.
     */
    public function scopeActive($query)
    {
        return $query->where('status', '!=', 'paused');
    }

    /**
     * Scope for user's projects.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Update project statistics.
     */
    public function updateStatistics(): void
    {
        $this->update([
            'keywords_count' => $this->keywords()->count(),
            'pages_generated' => $this->generatedPages()->count(),
            'pages_published' => $this->generatedPages()->where('status', 'published')->count(),
            'pages_indexed' => $this->generatedPages()
                ->whereHas('indexingStatus', function ($query) {
                    $query->where('google_indexed', true);
                })->count(),
        ]);
    }

    /**
     * Get progress percentage.
     */
    public function getProgressAttribute(): int
    {
        if ($this->keywords_count === 0) {
            return 0;
        }

        return (int) (($this->pages_published / $this->keywords_count) * 100);
    }
}
