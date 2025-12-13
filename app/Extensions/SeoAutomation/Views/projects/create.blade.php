@extends('panel.layout.app', ['disable_tblr' => true])
@section('title', 'Create SEO Project')
@section('titlebar_title', 'Create New SEO Project')
@section('titlebar_subtitle', 'Let AI analyze your website and start generating SEO content')

@section('content')
    <div class="py-10">
        <div class="container">
            <div class="row justify-content-center">
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-body p-6">
                            <div id="step-welcome" class="text-center">
                                <h2 class="mb-4">Welcome to SEO Automation</h2>
                                <p class="text-muted mb-6">
                                    Our AI will analyze your website, understand your business, research keywords,
                                    and generate SEO-optimized content automatically.
                                </p>

                                <form id="seo-project-form" onsubmit="analyzeWebsite(event)">
                                    <div class="mb-4">
                                        <label for="website-url" class="form-label">Website URL</label>
                                        <input
                                            type="url"
                                            class="form-control form-control-lg"
                                            id="website-url"
                                            name="url"
                                            placeholder="https://example.com"
                                            required
                                        >
                                        <div class="form-text">Enter your website URL to begin analysis</div>
                                    </div>

                                    <div class="mb-4">
                                        <label for="project-name" class="form-label">Project Name (Optional)</label>
                                        <input
                                            type="text"
                                            class="form-control"
                                            id="project-name"
                                            name="name"
                                            placeholder="My SEO Project"
                                        >
                                    </div>

                                    <button type="submit" class="btn btn-primary btn-lg w-100" id="analyze-btn">
                                        <svg class="me-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="m21 21-4.35-4.35"></path>
                                        </svg>
                                        Analyze Website with AI
                                    </button>
                                </form>
                            </div>

                            {{-- Loading State --}}
                            <div id="step-analyzing" class="text-center" style="display: none;">
                                <div class="mb-4">
                                    <div class="spinner-border text-primary" style="width: 4rem; height: 4rem;" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                                <h3 class="mb-2">Analyzing Your Website...</h3>
                                <p class="text-muted mb-4" id="analysis-status">
                                    Our AI is crawling your website and understanding your business
                                </p>
                                <div class="progress mb-4">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%"></div>
                                </div>
                                <ul class="list-unstyled text-start" style="max-width: 400px; margin: 0 auto;">
                                    <li class="mb-2">
                                        <svg class="text-success me-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Crawling website content
                                    </li>
                                    <li class="mb-2">
                                        <svg class="text-success me-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Analyzing business type & industry
                                    </li>
                                    <li class="mb-2">
                                        <svg class="text-success me-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Identifying target audience
                                    </li>
                                    <li class="mb-2">
                                        <svg class="text-success me-2" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                        Detecting brand voice
                                    </li>
                                </ul>
                            </div>

                            {{-- Success State --}}
                            <div id="step-complete" class="text-center" style="display: none;">
                                <svg class="text-success mb-4" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <h2 class="mb-2">Website Analyzed Successfully!</h2>
                                <p class="text-muted mb-4">Your SEO project has been created</p>
                                <div class="alert alert-info text-start mb-4" id="analysis-results">
                                    {{-- Analysis results will be inserted here --}}
                                </div>
                                <a href="{{ route('seo.projects.index') }}" class="btn btn-primary">
                                    View Project Details
                                </a>
                            </div>

                            {{-- Error State --}}
                            <div id="step-error" class="text-center" style="display: none;">
                                <svg class="text-danger mb-4" xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                                <h2 class="mb-2">Analysis Failed</h2>
                                <div class="alert alert-danger text-start mb-4" id="error-message">
                                    {{-- Error message will be inserted here --}}
                                </div>
                                <button type="button" class="btn btn-primary" onclick="resetForm()">
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function analyzeWebsite(event) {
            event.preventDefault();

            const form = document.getElementById('seo-project-form');
            const formData = new FormData(form);

            // Show analyzing state
            document.getElementById('step-welcome').style.display = 'none';
            document.getElementById('step-analyzing').style.display = 'block';

            // Submit to API
            fetch('{{ route("seo.projects.store") }}', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Accept': 'application/json',
                },
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success state
                    document.getElementById('step-analyzing').style.display = 'none';
                    document.getElementById('step-complete').style.display = 'block';

                    // Display results
                    const resultsHTML = `
                        <h5 class="mb-3">Analysis Results:</h5>
                        <p><strong>Business Type:</strong> ${data.project.business_type || 'N/A'}</p>
                        <p><strong>Industry:</strong> ${data.project.industry || 'N/A'}</p>
                        <p><strong>Target Audience:</strong> ${data.project.target_audience || 'N/A'}</p>
                        <p><strong>Brand Voice:</strong> ${data.project.brand_voice || 'N/A'}</p>
                        ${data.project.content_quality_score ? `<p><strong>Content Quality Score:</strong> ${data.project.content_quality_score}/100</p>` : ''}
                    `;
                    document.getElementById('analysis-results').innerHTML = resultsHTML;

                } else {
                    showError(data.message || 'Analysis failed. Please try again.');
                }
            })
            .catch(error => {
                showError('Network error: ' + error.message);
            });
        }

        function showError(message) {
            document.getElementById('step-analyzing').style.display = 'none';
            document.getElementById('step-error').style.display = 'block';
            document.getElementById('error-message').innerHTML = `<p class="mb-0">${message}</p>`;
        }

        function resetForm() {
            document.getElementById('step-error').style.display = 'none';
            document.getElementById('step-welcome').style.display = 'block';
            document.getElementById('seo-project-form').reset();
        }
    </script>
@endsection
