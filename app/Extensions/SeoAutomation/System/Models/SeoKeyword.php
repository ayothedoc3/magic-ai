<?php

namespace App\Extensions\SeoAutomation\System\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SeoKeyword extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'seo_keywords';

    protected $fillable = [
        'project_id',
        'seed_keyword',
        'variations',
        'search_intent',
        'priority_score',
        'search_volume',
        'difficulty',
        'status',
        'notes',
    ];

    protected $casts = [
        'variations' => 'array',
        'priority_score' => 'float',
        'search_volume' => 'integer',
    ];

    /**
     * Get the project that owns the keyword.
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(SeoProject::class, 'project_id');
    }

    /**
     * Get the generated page for this keyword.
     */
    public function generatedPage(): HasOne
    {
        return $this->hasOne(SeoGeneratedPage::class, 'keyword_id');
    }

    /**
     * Scope for pending keywords.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for high priority keywords.
     */
    public function scopeHighPriority($query)
    {
        return $query->where('priority_score', '>=', 0.7)->orderByDesc('priority_score');
    }

    /**
     * Scope by search intent.
     */
    public function scopeByIntent($query, string $intent)
    {
        return $query->where('search_intent', $intent);
    }

    /**
     * Mark as generating.
     */
    public function markAsGenerating(): void
    {
        $this->update(['status' => 'generating']);
    }

    /**
     * Mark as generated.
     */
    public function markAsGenerated(): void
    {
        $this->update(['status' => 'generated']);
    }

    /**
     * Mark as published.
     */
    public function markAsPublished(): void
    {
        $this->update(['status' => 'published']);
    }
}
