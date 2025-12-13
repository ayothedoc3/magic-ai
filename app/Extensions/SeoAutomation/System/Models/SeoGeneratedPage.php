<?php

namespace App\Extensions\SeoAutomation\System\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SeoGeneratedPage extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'seo_generated_pages';

    protected $fillable = [
        'keyword_id',
        'project_id',
        'title',
        'slug',
        'meta_description',
        'content_html',
        'content_markdown',
        'schema_markup',
        'internal_links',
        'word_count',
        'published_url',
        'cms_post_id',
        'llm_visibility_score',
        'status',
        'published_at',
    ];

    protected $casts = [
        'schema_markup' => 'array',
        'internal_links' => 'array',
        'word_count' => 'integer',
        'cms_post_id' => 'integer',
        'llm_visibility_score' => 'float',
        'published_at' => 'datetime',
    ];

    /**
     * Get the project that owns the page.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(SeoProject::class, 'project_id');
    }

    /**
     * Get the keyword for this page.
     */
    public function keyword(): BelongsTo
    {
        return $this->belongsTo(SeoKeyword::class, 'keyword_id');
    }

    /**
     * Get the indexing status for this page.
     */
    public function indexingStatus(): HasOne
    {
        return $this->hasOne(SeoIndexingStatus::class, 'page_id');
    }

    /**
     * Scope for published pages.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Scope for draft pages.
     */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /**
     * Scope for approved pages.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Mark as approved.
     */
    public function approve(): void
    {
        $this->update(['status' => 'approved']);
    }

    /**
     * Mark as published.
     */
    public function markAsPublished(string $url, ?int $cmsPostId = null): void
    {
        $this->update([
            'status' => 'published',
            'published_url' => $url,
            'cms_post_id' => $cmsPostId,
            'published_at' => now(),
        ]);

        // Update keyword status
        $this->keyword->markAsPublished();

        // Update project statistics
        $this->project->updateStatistics();
    }

    /**
     * Get excerpt from content.
     */
    public function getExcerptAttribute(): string
    {
        return \Str::limit(strip_tags($this->content_html), 150);
    }

    /**
     * Check if page is indexed.
     */
    public function isIndexed(): bool
    {
        return $this->indexingStatus?->google_indexed ?? false;
    }
}
