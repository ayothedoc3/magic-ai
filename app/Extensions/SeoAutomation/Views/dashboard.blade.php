@extends('panel.layout.app', ['disable_tblr' => true])
@section('title', 'SEO Automation Dashboard')
@section('titlebar_title', 'SEO Automation Dashboard')
@section('titlebar_subtitle', 'Automate your SEO content generation and indexing')

@section('content')
    <div class="py-10">
        <div class="container">
            {{-- Stats Overview --}}
            <div class="row g-3 mb-6">
                <div class="col-md-6 col-lg-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <p class="text-muted mb-1">Total Projects</p>
                                    <h2 class="mb-0">{{ $stats['total_projects'] }}</h2>
                                </div>
                                <div class="avatar avatar-lg bg-primary text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 col-lg-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <p class="text-muted mb-1">Keywords Researched</p>
                                    <h2 class="mb-0">{{ $stats['total_keywords'] }}</h2>
                                </div>
                                <div class="avatar avatar-lg bg-success text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.35-4.35"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 col-lg-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <p class="text-muted mb-1">Pages Generated</p>
                                    <h2 class="mb-0">{{ $stats['total_pages'] }}</h2>
                                </div>
                                <div class="avatar avatar-lg bg-info text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-md-6 col-lg-3">
                    <div class="card h-100">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between">
                                <div>
                                    <p class="text-muted mb-1">Pages Published</p>
                                    <h2 class="mb-0">{{ $stats['pages_published'] }}</h2>
                                </div>
                                <div class="avatar avatar-lg bg-warning text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Quick Actions --}}
            <div class="row g-3 mb-6">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            <h3 class="card-title mb-4">Quick Actions</h3>
                            <div class="row g-3">
                                <div class="col-md-4">
                                    <a href="{{ route('seo.projects.create') }}" class="btn btn-lg btn-primary w-100">
                                        <svg class="me-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        Create New Project
                                    </a>
                                </div>
                                <div class="col-md-4">
                                    <a href="{{ route('seo.projects.index') }}" class="btn btn-lg btn-outline-primary w-100">
                                        View All Projects
                                    </a>
                                </div>
                                <div class="col-md-4">
                                    <a href="{{ route('seo.analytics.index') }}" class="btn btn-lg btn-outline-primary w-100">
                                        View Analytics
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {{-- Recent Projects --}}
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Projects</h3>
                        </div>
                        <div class="card-body">
                            @if($recentProjects->count() > 0)
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Project Name</th>
                                                <th>URL</th>
                                                <th>Business Type</th>
                                                <th>Keywords</th>
                                                <th>Pages</th>
                                                <th>Status</th>
                                                <th>Created</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach($recentProjects as $project)
                                                <tr>
                                                    <td>
                                                        <strong>{{ $project->name }}</strong>
                                                    </td>
                                                    <td>
                                                        <a href="{{ $project->url }}" target="_blank" class="text-muted">
                                                            {{ \Illuminate\Support\Str::limit($project->url, 30) }}
                                                        </a>
                                                    </td>
                                                    <td>
                                                        <span class="badge bg-primary">{{ $project->business_type ?? 'Unknown' }}</span>
                                                    </td>
                                                    <td>{{ $project->keywords_count ?? 0 }}</td>
                                                    <td>{{ $project->generated_pages_count ?? 0 }}</td>
                                                    <td>
                                                        @switch($project->status)
                                                            @case('analyzing')
                                                                <span class="badge bg-info">Analyzing</span>
                                                                @break
                                                            @case('ready')
                                                                <span class="badge bg-success">Ready</span>
                                                                @break
                                                            @case('active')
                                                                <span class="badge bg-success">Active</span>
                                                                @break
                                                            @default
                                                                <span class="badge bg-secondary">{{ $project->status }}</span>
                                                        @endswitch
                                                    </td>
                                                    <td>{{ $project->created_at->diffForHumans() }}</td>
                                                    <td>
                                                        <a href="{{ route('seo.projects.show', $project) }}" class="btn btn-sm btn-primary">
                                                            View
                                                        </a>
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>
                            @else
                                <div class="text-center py-8">
                                    <svg class="mb-4 opacity-50" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    <h3 class="mb-2">No Projects Yet</h3>
                                    <p class="text-muted mb-4">Get started by creating your first SEO project</p>
                                    <a href="{{ route('seo.projects.create') }}" class="btn btn-primary">
                                        Create Your First Project
                                    </a>
                                </div>
                            @endif
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endsection
