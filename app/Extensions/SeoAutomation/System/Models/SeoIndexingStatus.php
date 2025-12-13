<?php

namespace App\Extensions\SeoAutomation\System\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeoIndexingStatus extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'seo_indexing_status';

    protected $fillable = [
        'page_id',
        'google_indexed',
        'submitted_to_google',
        'last_crawled',
        'submitted_at',
        'indexing_issues',
        'ranking_position',
        'checked_at',
    ];

    protected $casts = [
        'google_indexed' => 'boolean',
        'submitted_to_google' => 'boolean',
        'indexing_issues' => 'array',
        'ranking_position' => 'integer',
        'last_crawled' => 'datetime',
        'submitted_at' => 'datetime',
        'checked_at' => 'datetime',
    ];

    /**
     * Get the page that owns this indexing status.
     */
    public function page(): BelongsTo
    {
        return $this->belongsTo(SeoGeneratedPage::class, 'page_id');
    }

    /**
     * Scope for indexed pages.
     */
    public function scopeIndexed($query)
    {
        return $query->where('google_indexed', true);
    }

    /**
     * Scope for not indexed pages.
     */
    public function scopeNotIndexed($query)
    {
        return $query->where('google_indexed', false);
    }

    /**
     * Mark as submitted to Google.
     */
    public function markAsSubmitted(): void
    {
        $this->update([
            'submitted_to_google' => true,
            'submitted_at' => now(),
        ]);
    }

    /**
     * Update indexing status.
     */
    public function updateIndexingStatus(bool $indexed, ?array $issues = null): void
    {
        $this->update([
            'google_indexed' => $indexed,
            'indexing_issues' => $issues,
            'checked_at' => now(),
        ]);

        // Update project statistics if indexed status changed
        if ($this->wasChanged('google_indexed')) {
            $this->page->project->updateStatistics();
        }
    }
}
