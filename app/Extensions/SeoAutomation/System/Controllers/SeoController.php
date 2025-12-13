<?php

namespace App\Extensions\SeoAutomation\System\Controllers;

use App\Extensions\SeoAutomation\System\Models\SeoProject;
use App\Extensions\SeoAutomation\System\Services\WebsiteAnalyzerService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SeoController extends Controller
{
    public function __construct(
        protected WebsiteAnalyzerService $analyzer
    ) {
    }

    /**
     * Dashboard - Overview of all SEO projects
     */
    public function dashboard()
    {
        $user = Auth::user();

        $stats = [
            'total_projects'   => SeoProject::where('user_id', $user->id)->count(),
            'active_projects'  => SeoProject::where('user_id', $user->id)->where('status', 'active')->count(),
            'total_keywords'   => $user->seoProjects()->withCount('keywords')->get()->sum('keywords_count'),
            'total_pages'      => $user->seoProjects()->withCount('generatedPages')->get()->sum('generated_pages_count'),
            'pages_published'  => $user->seoProjects()
                ->with(['generatedPages' => fn($q) => $q->where('status', 'published')])
                ->get()
                ->sum(fn($p) => $p->generatedPages->count()),
        ];

        $recentProjects = SeoProject::where('user_id', $user->id)
            ->with(['keywords', 'generatedPages'])
            ->withCount(['keywords', 'generatedPages'])
            ->latest()
            ->take(5)
            ->get();

        return view('seo::dashboard', compact('stats', 'recentProjects'));
    }

    /**
     * Projects - List all projects
     */
    public function projectsIndex()
    {
        $user = Auth::user();

        $projects = SeoProject::where('user_id', $user->id)
            ->withCount(['keywords', 'generatedPages'])
            ->latest()
            ->paginate(10);

        return view('seo::projects.index', compact('projects'));
    }

    /**
     * Create Project - Show onboarding form
     */
    public function projectsCreate()
    {
        return view('seo::projects.create');
    }

    /**
     * Store Project - Analyze website and create project
     */
    public function projectsStore(Request $request)
    {
        $validated = $request->validate([
            'url'  => 'required|url',
            'name' => 'nullable|string|max:255',
        ]);

        try {
            $project = $this->analyzer->analyze(
                $validated['url'],
                Auth::id(),
                $validated['name'] ?? null
            );

            return response()->json([
                'success' => true,
                'message' => 'Website analyzed successfully!',
                'project' => $project,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Analysis failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Show Project Details
     */
    public function projectsShow(SeoProject $project)
    {
        $this->authorize('view', $project);

        $project->load(['keywords', 'generatedPages']);

        return view('seo::projects.show', compact('project'));
    }

    /**
     * Keywords - List all keywords
     */
    public function keywordsIndex()
    {
        $user = Auth::user();

        $keywords = $user->seoProjects()
            ->with('keywords')
            ->get()
            ->pluck('keywords')
            ->flatten()
            ->sortByDesc('priority_score')
            ->take(50);

        return view('seo::keywords.index', compact('keywords'));
    }

    /**
     * Content - List all generated pages
     */
    public function contentIndex()
    {
        $user = Auth::user();

        $pages = $user->seoProjects()
            ->with(['generatedPages.keyword'])
            ->get()
            ->pluck('generatedPages')
            ->flatten()
            ->sortByDesc('created_at')
            ->take(50);

        return view('seo::content.index', compact('pages'));
    }

    /**
     * Analytics - Indexing status and LLM visibility
     */
    public function analyticsIndex()
    {
        $user = Auth::user();

        $projects = SeoProject::where('user_id', $user->id)
            ->with(['generatedPages.indexingStatus'])
            ->get();

        $indexingStats = [
            'total_pages'    => $projects->sum(fn($p) => $p->generatedPages->count()),
            'indexed_pages'  => $projects->sum(fn($p) => $p->generatedPages->filter(fn($page) => $page->indexingStatus?->google_indexed)->count()),
            'pending_pages'  => $projects->sum(fn($p) => $p->generatedPages->filter(fn($page) => !$page->indexingStatus?->google_indexed)->count()),
        ];

        return view('seo::analytics.index', compact('projects', 'indexingStats'));
    }
}
