# 🚀 Deploy MagicAI + SEO Extension to Coolify

## Prerequisites
- Coolify instance running
- Domain name ready (optional but recommended)
- Claude API key from Anthropic

---

## Step 1: Prepare Environment Variables

Create a `.env` file with these critical settings:

```bash
APP_NAME="MagicAI SEO"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database (Coolify will provide these)
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=magicai
DB_USERNAME=magicai_user
DB_PASSWORD=your_secure_password

# Claude API (REQUIRED for SEO extension)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# SEO Extension Settings
SEO_AUTOMATION_ENABLED=true
SEO_CLAUDE_MODEL=claude-sonnet-4-5-20250929
SEO_CLAUDE_MAX_TOKENS=4000

# Optional: External SEO APIs (can add later)
SEO_SERP_API_KEY=
SEO_GOOGLE_API_KEY=
```

---

## Step 2: Coolify Configuration

### Option A: Via Coolify UI (Recommended)

1. **Create New Resource**
   - Go to your Coolify dashboard
   - Click "New Resource"
   - Select "Public Repository" or "Private Repository"

2. **Repository Settings**
   - Repository URL: Upload your MagicAI folder or connect Git repo
   - Branch: `main` or `master`
   - Build Pack: `nixpacks` (auto-detects Laravel)

3. **Environment Variables**
   - In Coolify UI, go to "Environment Variables" tab
   - Add all variables from `.env` above
   - Coolify will auto-generate DB credentials

4. **Database**
   - Add MySQL service: Click "Add Database" → MySQL 8.0
   - Coolify will link it automatically
   - Note the credentials provided

5. **Build Configuration**
   - Build Command: `composer install --no-dev --optimize-autoloader`
   - Start Command: Leave empty (uses default PHP-FPM)
   - Port: 80

---

### Option B: Using Nixpacks Config File

Create `nixpacks.toml` in project root:

```toml
[phases.setup]
nixPkgs = ["php82", "php82Packages.composer", "nodejs_20"]

[phases.build]
cmds = [
    "composer install --no-dev --optimize-autoloader --no-interaction",
    "php artisan config:cache",
    "php artisan route:cache",
    "php artisan view:cache"
]

[phases.deploy]
cmds = ["php artisan migrate --force"]

[start]
cmd = "php artisan serve --host=0.0.0.0 --port=80"
```

---

## Step 3: Post-Deployment Commands

Once Coolify deploys, run these commands in Coolify's terminal:

```bash
# Run migrations (creates SEO tables)
php artisan migrate --force

# Create admin user (if needed)
php artisan db:seed

# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Verify SEO extension loaded
php artisan route:list | grep seo
```

---

## Step 4: Test SEO Extension

### Health Check
```bash
curl https://your-domain.com/seo/health
```

Expected response:
```json
{
  "status": "ok",
  "extension": "SEO Automation",
  "version": "1.0.0",
  "tables": {
    "seo_projects": true,
    "seo_keywords": true,
    "seo_generated_pages": true,
    "seo_indexing_status": true,
    "seo_llm_visibility": true
  }
}
```

### Test Website Analysis
```bash
curl https://your-domain.com/seo/test
```

This will:
1. Create a test user (if none exists)
2. Analyze Shopify.com
3. Return business type, industry, analysis data

---

## Step 5: Verify Database Tables

Access Coolify's database terminal and run:

```sql
SHOW TABLES LIKE 'seo_%';
```

Should show:
- `seo_projects`
- `seo_keywords`
- `seo_generated_pages`
- `seo_indexing_status`
- `seo_llm_visibility`

---

## Troubleshooting

### Issue: "Class SeoAutomationServiceProvider not found"
**Fix**: Run in Coolify terminal:
```bash
composer dump-autoload
php artisan config:clear
```

### Issue: "SQLSTATE[HY000] [2002] Connection refused"
**Fix**: Check database environment variables in Coolify
```bash
# Verify DB connection
php artisan tinker
>>> DB::connection()->getPdo();
```

### Issue: "SEO routes not found"
**Fix**: Clear route cache
```bash
php artisan route:clear
php artisan route:cache
php artisan route:list | grep seo
```

### Issue: Claude API errors
**Fix**: Verify ANTHROPIC_API_KEY in Coolify env vars
```bash
# Test Claude connection
php artisan tinker
>>> $key = env('ANTHROPIC_API_KEY');
>>> echo substr($key, 0, 10); // Should show "sk-ant-api"
```

---

## Production Checklist

Before going live:

- [ ] Set `APP_DEBUG=false`
- [ ] Set `APP_ENV=production`
- [ ] Configure proper `APP_URL`
- [ ] Add SSL certificate (Coolify does this automatically)
- [ ] Set strong `DB_PASSWORD`
- [ ] Add `ANTHROPIC_API_KEY`
- [ ] Run `php artisan migrate --force`
- [ ] Test `/seo/health` endpoint
- [ ] Test `/seo/test` endpoint
- [ ] Create first admin user
- [ ] Disable test routes in production (optional)

---

## Next Steps After Deployment

Once deployed and tested:

1. **Access MagicAI Dashboard**
   - Go to `https://your-domain.com`
   - Login with admin credentials
   - Navigate to SEO Automation (will be added to menu)

2. **Test Real Website Analysis**
   ```bash
   php artisan tinker

   $analyzer = app(\App\Extensions\SeoAutomation\System\Services\WebsiteAnalyzerService::class);
   $user = \App\Models\User::first();
   $project = $analyzer->analyze('https://your-client-site.com', $user->id, 'Client Project');

   print_r($project->toArray());
   ```

3. **Build Next Services**
   - KeywordResearchService
   - ContentGeneratorService
   - API endpoints
   - Admin dashboard

---

## Coolify-Specific Tips

**Automatic Deployments:**
- Connect to GitHub/GitLab
- Enable automatic deployments on push
- Coolify will rebuild and redeploy automatically

**Logs:**
- View application logs in Coolify UI
- Check Laravel logs: `storage/logs/laravel.log`

**Database Backups:**
- Configure automatic backups in Coolify
- Recommended: Daily backups

**Scaling:**
- Start with 1 instance
- Add workers for queue processing later
- Add Redis for caching (optional)

---

## Security Notes

**Important:**
- Never commit `.env` to Git
- Use Coolify's environment variable manager
- Rotate `APP_KEY` if exposed
- Keep `ANTHROPIC_API_KEY` secure
- Set up rate limiting for `/seo/test` route

**Disable test routes in production:**

Edit `app/Extensions/SeoAutomation/Routes/web.php`:

```php
// Only load test routes in non-production
if (!app()->environment('production')) {
    Route::get('/seo/test', function () {
        // ... test route
    });
}

// Keep health check always available
Route::get('/seo/health', function () {
    // ... health check
});
```

---

## Ready to Deploy! 🚀

Your SEO extension is ready for Coolify deployment. After deploying:

1. Verify health check passes
2. Test website analysis with real site
3. Confirm with me that everything works
4. We'll build the next features (keyword research, content generation)

Let me know when deployment is complete!
