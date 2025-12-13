# 🎯 One-Command SEO Extension Installation

## Option 1: Automatic Registration (Recommended)

I've prepared everything. Just run these commands:

### Step 1: Install Dependencies (if not done)
```bash
composer install
```

### Step 2: Register Extension
Open `config/app.php` and find the `providers` array, then add:

```php
'providers' => [
    // ... existing providers ...

    /*
     * Custom Extension Service Providers
     */
    App\Extensions\SeoAutomation\SeoAutomationServiceProvider::class,
],
```

**OR** modify `app/Providers/AppServiceProvider.php`:

```php
public function register(): void
{
    // Register SEO Extension
    $this->app->register(\App\Extensions\SeoAutomation\SeoAutomationServiceProvider::class);
}
```

### Step 3: Run Migrations
```bash
php artisan migrate
```

### Step 4: Clear Caches
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

---

## Option 2: Quick Test Script

I'll create a test route for you. Run this command:

```bash
php artisan route:list | grep seo
```

If you see SEO routes, it's working!

---

## 🧪 Test the Extension

### Quick Test (Tinker)

```bash
php artisan tinker
```

Then:
```php
// Check if extension is loaded
app()->getProvider('App\Extensions\SeoAutomation\SeoAutomationServiceProvider');

// Should return the provider object if loaded

// Test WebsiteAnalyzer
$analyzer = app(\App\Extensions\SeoAutomation\System\Services\WebsiteAnalyzerService::class);

// Get or create a user
$user = \App\Models\User::first();
// If null, create one:
// $user = \App\Models\User::factory()->create();

// Analyze a website
$project = $analyzer->analyze('https://shopify.com', $user->id, 'Shopify Test');

// View results
$project->business_type;  // "E-commerce"
$project->industry;        // "E-commerce Platform"
$project->target_audience; // ...
print_r($project->analysis_data);
```

---

## ✅ Verification

Run this to verify everything is set up:

```bash
# Check migrations
php artisan migrate:status | grep seo

# Should show:
# Ran  2025_01_12_000001_create_seo_projects_table
# Ran  2025_01_12_000002_create_seo_keywords_table
# Ran  2025_01_12_000003_create_seo_generated_pages_table
# Ran  2025_01_12_000004_create_seo_indexing_status_table
# Ran  2025_01_12_000005_create_seo_llm_visibility_table

# Check if tables exist
php artisan tinker
>>> DB::table('seo_projects')->count();
// Should return 0 (or number of projects)
```

---

## 🎨 What You'll Be Able to Do

Once set up, you can:

1. **Analyze any website:**
   ```php
   $project = $analyzer->analyze('https://example.com', $userId);
   ```

2. **View analysis:**
   ```php
   $project->business_type;    // AI-detected business type
   $project->industry;          // Specific industry
   $project->analysis_data;     // Full AI analysis JSON
   ```

3. **Check database:**
   - Open HeidiSQL / phpMyAdmin
   - Check `seo_projects` table
   - See the AI analysis stored

---

## 🔥 Next: Build More Features

Once this is working, I'll add:
- Keyword Research Service
- Content Generator Service
- API endpoints
- Dashboard UI

Ready to continue? Just confirm the installation worked! 🚀
