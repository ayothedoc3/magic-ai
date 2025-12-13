# 🚀 MagicAI + SEO Extension - Local Development Setup (Windows)

## Prerequisites

You need to install these on your Windows machine:

### Option 1: Laragon (Recommended - Easiest)
**Download:** https://laragon.org/download/

Laragon includes everything:
- ✅ PHP 8.2+
- ✅ MySQL
- ✅ Composer
- ✅ Node.js
- ✅ Apache/Nginx
- ✅ One-click setup

### Option 2: XAMPP (Alternative)
**Download:** https://www.apachefriends.org/

Then install separately:
- Composer: https://getcomposer.org/download/
- Node.js: https://nodejs.org/

### Option 3: Docker (Advanced)
Use Docker Desktop + Laravel Sail

---

## 🎯 Quick Setup with Laragon (Recommended)

### Step 1: Install Laragon

1. Download Laragon Full version
2. Install to `C:\laragon`
3. Start Laragon (it will install Apache, MySQL, PHP automatically)

### Step 2: Set Up MagicAI Project

```bash
# 1. Move your MagicAI folder to Laragon's www directory
# Move from: C:\Users\ayoth\Downloads\codecanyon-rq6rHiWz-magicai-...
# To: C:\laragon\www\magicai

# 2. Open Laragon Terminal (right-click Laragon tray icon > Terminal)

# 3. Navigate to project
cd magicai

# 4. Install PHP dependencies
composer install

# 5. Install Node dependencies (if needed)
npm install
```

### Step 3: Configure Environment

```bash
# 1. Copy .env.example to .env
copy .env.example .env

# 2. Generate application key
php artisan key:generate
```

### Step 4: Configure Database

**In Laragon:**
1. Right-click Laragon tray icon → MySQL → Open
2. Username: `root`
3. Password: (leave empty)

**Create database:**
```sql
CREATE DATABASE magicai;
```

**Or use Laragon's built-in:**
1. Right-click Laragon → Database → Create database
2. Name it: `magicai`

### Step 5: Update .env File

Edit `C:\laragon\www\magicai\.env`:

```env
APP_NAME="MagicAI"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://magicai.test

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=magicai
DB_USERNAME=root
DB_PASSWORD=

# Add Claude API Key (get from https://console.anthropic.com/)
ANTHROPIC_API_KEY=your_claude_api_key_here
```

### Step 6: Run Migrations

```bash
# Run MagicAI's existing migrations
php artisan migrate

# This will create all MagicAI tables + our new SEO tables
```

### Step 7: Seed Database (Optional)

```bash
# Create admin user and sample data
php artisan db:seed
```

### Step 8: Start Development Server

**Option A: Use Laragon (Automatic)**
- Laragon automatically serves at: `http://magicai.test`
- Just visit the URL in your browser

**Option B: Use PHP Built-in Server**
```bash
php artisan serve
# Visit: http://localhost:8000
```

---

## 🔧 Register SEO Extension

### Step 1: Register Service Provider

Edit: `app/Providers/AppServiceProvider.php`

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Add this line:
        $this->app->register(\App\Extensions\SeoAutomation\SeoAutomationServiceProvider::class);
    }

    public function boot(): void
    {
        //
    }
}
```

### Step 2: Clear Cache

```bash
php artisan config:clear
php artisan cache:clear
php artisan view:clear
```

### Step 3: Run Migrations Again (for SEO tables)

```bash
php artisan migrate
```

You should see:
```
✓ 2025_01_12_000001_create_seo_projects_table
✓ 2025_01_12_000002_create_seo_keywords_table
✓ 2025_01_12_000003_create_seo_generated_pages_table
✓ 2025_01_12_000004_create_seo_indexing_status_table
✓ 2025_01_12_000005_create_seo_llm_visibility_table
```

---

## 🧪 Test the SEO Extension

### Method 1: Using Tinker (Quick Test)

```bash
php artisan tinker
```

Then run:
```php
use App\Extensions\SeoAutomation\System\Services\WebsiteAnalyzerService;

// Create a test user (if you don't have one)
$user = \App\Models\User::first(); // Or create one

// Analyze a website
$analyzer = app(WebsiteAnalyzerService::class);
$project = $analyzer->analyze('https://shopify.com', $user->id);

// View results
print_r($project->toArray());
```

### Method 2: Create Test Route

Create: `routes/web.php` (add at the end)

```php
Route::get('/test-seo', function () {
    $analyzer = app(\App\Extensions\SeoAutomation\System\Services\WebsiteAnalyzerService::class);

    // Get or create test user
    $user = \App\Models\User::first();

    if (!$user) {
        return 'Please create a user first!';
    }

    try {
        $project = $analyzer->analyze('https://example.com', $user->id);

        return response()->json([
            'success' => true,
            'project' => $project,
            'analysis' => $project->analysis_data,
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'error' => $e->getMessage(),
        ]);
    }
});
```

Then visit: `http://magicai.test/test-seo`

---

## 🗄️ Check Database

### Using HeidiSQL (Comes with Laragon)

1. Right-click Laragon → Database → HeidiSQL
2. Connect to: `127.0.0.1`
3. User: `root`, Password: (empty)
4. Select database: `magicai`
5. You should see our new tables:
   - `seo_projects`
   - `seo_keywords`
   - `seo_generated_pages`
   - `seo_indexing_status`
   - `seo_llm_visibility`

---

## 🎨 Access MagicAI Dashboard

1. Visit: `http://magicai.test` (or `http://localhost:8000`)
2. Register an account or use:
   - Email: admin@admin.com
   - Password: admin123 (check `database/seeders/`)

---

## 🔑 Get Claude API Key

1. Go to: https://console.anthropic.com/
2. Sign up / Log in
3. Go to: API Keys
4. Create new key
5. Copy and add to `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   ```

---

## 🐛 Troubleshooting

### Error: "Class not found"
```bash
composer dump-autoload
php artisan config:clear
```

### Error: "Table doesn't exist"
```bash
php artisan migrate:fresh
```

### Error: "Connection refused"
- Make sure Laragon MySQL is running (green icon)
- Check database credentials in `.env`

### Error: "Permission denied"
```bash
# In Laragon terminal
chmod -R 775 storage
chmod -R 775 bootstrap/cache
```

### Claude API Error
- Check your API key in `.env`
- Make sure you have credits in Anthropic account
- Test with a simple call first

---

## 📊 What You Can Test Right Now

### 1. Website Analysis
```php
$project = $analyzer->analyze('https://nike.com', $userId);

// Returns:
// - Business type: "E-commerce"
// - Industry: "Fashion/Sportswear"
// - Target audience: "Athletes and fitness enthusiasts..."
// - Brand voice: "Inspiring, athletic, premium"
// - Content quality: 8.5/10
// - Keywords found: [...]
// - SEO strategies: [...]
```

### 2. Database Records
Check `seo_projects` table - you'll see the analyzed project

### 3. JSON Analysis
View `analysis_data` column - full Claude response with insights

---

## 🎯 Next Steps After Local Setup

Once everything is running locally:

1. ✅ Test WebsiteAnalyzer with different sites
2. I'll build KeywordResearchService
3. I'll build ContentGeneratorService
4. Create simple admin dashboard
5. Test full workflow: Analyze → Keywords → Generate Content

---

## 💡 Quick Commands Reference

```bash
# Start Laragon
# Just click the Laragon icon, click "Start All"

# Open terminal
# Right-click Laragon tray icon → Terminal

# Navigate to project
cd magicai

# Run migrations
php artisan migrate

# Clear cache
php artisan cache:clear

# Run tinker (interactive PHP)
php artisan tinker

# View logs
tail -f storage/logs/laravel.log

# Run tests
php artisan test
```

---

## 🆘 Need Help?

If you get stuck:
1. Check `storage/logs/laravel.log`
2. Run `php artisan config:clear`
3. Make sure Laragon MySQL is running
4. Verify `.env` database settings

---

## ✅ Verification Checklist

Before proceeding, make sure:
- [ ] Laragon installed and running
- [ ] Database `magicai` created
- [ ] `.env` configured
- [ ] `composer install` completed
- [ ] Migrations ran successfully
- [ ] Can access `http://magicai.test`
- [ ] SEO extension registered
- [ ] SEO tables exist in database
- [ ] Claude API key added to `.env`

Once all checked, you're ready to test! 🚀
