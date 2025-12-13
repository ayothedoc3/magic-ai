@extends('panel.layout.app', ['disable_tblr' => true])
@section('title', 'SEO Projects')
@section('titlebar_title', 'SEO Projects')
@section('titlebar_subtitle', 'Manage all your SEO automation projects')

@section('content')
    <div class="py-10">
        <div class="container">
            <div class="row mb-4">
                <div class="col">
                    <a href="{{ route('seo.projects.create') }}" class="btn btn-primary">
                        <svg class="me-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Create New Project
                    </a>
                </div>
            </div>

            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body">
                            @if($projects->count() > 0)
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Project Name</th>
                                                <th>URL</th>
                                                <th>Business Type</th>
                                                <th>Industry</th>
                                                <th>Keywords</th>
                                                <th>Pages Generated</th>
                                                <th>Status</th>
                                                <th>Created</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            @foreach($projects as $project)
                                                <tr>
                                                    <td>
                                                        <div>
                                                            <strong>{{ $project->name }}</strong>
                                                            @if($project->content_quality_score)
                                                                <div class="text-muted small">Quality: {{ $project->content_quality_score }}/100</div>
                                                            @endif
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <a href="{{ $project->url }}" target="_blank" class="text-decoration-none">
                                                            {{ \Illuminate\Support\Str::limit($project->url, 40) }}
                                                        </a>
                                                    </td>
                                                    <td>
                                                        <span class="badge bg-primary">{{ $project->business_type ?? 'N/A' }}</span>
                                                    </td>
                                                    <td>{{ $project->industry ?? 'N/A' }}</td>
                                                    <td class="text-center">
                                                        <span class="badge bg-info">{{ $project->keywords_count ?? 0 }}</span>
                                                    </td>
                                                    <td class="text-center">
                                                        <span class="badge bg-success">{{ $project->generated_pages_count ?? 0 }}</span>
                                                    </td>
                                                    <td>
                                                        @switch($project->status)
                                                            @case('analyzing')
                                                                <span class="badge bg-info">
                                                                    <span class="spinner-border spinner-border-sm me-1"></span>
                                                                    Analyzing
                                                                </span>
                                                                @break
                                                            @case('ready')
                                                                <span class="badge bg-success">Ready</span>
                                                                @break
                                                            @case('generating')
                                                                <span class="badge bg-warning">
                                                                    <span class="spinner-border spinner-border-sm me-1"></span>
                                                                    Generating
                                                                </span>
                                                                @break
                                                            @case('active')
                                                                <span class="badge bg-success">Active</span>
                                                                @break
                                                            @case('paused')
                                                                <span class="badge bg-secondary">Paused</span>
                                                                @break
                                                            @default
                                                                <span class="badge bg-secondary">{{ ucfirst($project->status) }}</span>
                                                        @endswitch
                                                    </td>
                                                    <td>{{ $project->created_at->format('M d, Y') }}</td>
                                                    <td>
                                                        <a href="{{ route('seo.projects.show', $project) }}" class="btn btn-sm btn-primary">
                                                            View Details
                                                        </a>
                                                    </td>
                                                </tr>
                                            @endforeach
                                        </tbody>
                                    </table>
                                </div>

                                {{-- Pagination --}}
                                <div class="mt-4">
                                    {{ $projects->links() }}
                                </div>
                            @else
                                <div class="text-center py-8">
                                    <svg class="mb-4 opacity-50" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                    <h3 class="mb-2">No SEO Projects Yet</h3>
                                    <p class="text-muted mb-4">Start automating your SEO by creating your first project</p>
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
