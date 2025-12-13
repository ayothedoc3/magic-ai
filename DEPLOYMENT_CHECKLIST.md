# ✅ Coolify Deployment Checklist

## Pre-Deployment (Do These First)

- [ ] Have Claude API key ready (get from console.anthropic.com)
- [ ] Have domain name ready (or use Coolify subdomain)
- [ ] Coolify instance is running and accessible
- [ ] Git repository set up (optional but recommended)

---

## Coolify Setup

### 1. Create MySQL Database
- [ ] In Coolify, go to "Databases"
- [ ] Click "New Database" → MySQL 8.0
- [ ] Name it: `magicai-db`
- [ ] Note the generated credentials
- [ ] Wait for database to start (green status)

### 2. Create Application
- [ ] Go to "Applications" → "New Application"
- [ ] Choose:
  - **Source**: Upload folder or Git repo
  - **Build Pack**: Nixpacks (auto-detects Laravel)
  - **Port**: 80
  - **Domain**: your-domain.com

### 3. Configure Environment Variables
Copy from `.env.coolify.example` and set in Coolify UI:

**Critical Variables:**
- [ ] `APP_NAME` = MagicAI SEO
- [ ] `APP_ENV` = production
- [ ] `APP_DEBUG` = false
- [ ] `APP_URL` = https://your-domain.com
- [ ] `APP_KEY` = (generate with `php artisan key:generate --show`)

**Database Connection:**
- [ ] `DB_CONNECTION` = mysql
- [ ] `DB_HOST` = (use Coolify's internal hostname)
- [ ] `DB_PORT` = 3306
- [ ] `DB_DATABASE` = magicai
- [ ] `DB_USERNAME` = (from Coolify DB credentials)
- [ ] `DB_PASSWORD` = (from Coolify DB credentials)

**Claude API:**
- [ ] `ANTHROPIC_API_KEY` = sk-ant-api03-YOUR-KEY

**SEO Extension:**
- [ ] `SEO_AUTOMATION_ENABLED` = true
- [ ] `SEO_CLAUDE_MODEL` = claude-sonnet-4-5-20250929
- [ ] `SEO_CLAUDE_MAX_TOKENS` = 4000

### 4. Deploy
- [ ] Click "Deploy" button in Coolify
- [ ] Wait for build to complete (2-5 minutes)
- [ ] Check build logs for errors
- [ ] Verify status shows "Running" (green)

---

## Post-Deployment Verification

### 1. Access Coolify Terminal
In Coolify UI, click on your app → "Terminal" tab

### 2. Run Migrations
```bash
php artisan migrate --force
```
- [ ] Check output - should show 5 new SEO tables created
- [ ] No errors reported

### 3. Create Admin User
```bash
php artisan db:seed
# OR manually create user
php artisan tinker
>>> $user = \App\Models\User::create([
    'name' => 'Admin',
    'email' => 'admin@yourdomain.com',
    'password' => bcrypt('password123'),
    'role' => 'admin'
]);
```
- [ ] Admin user created successfully

### 4. Verify Routes
```bash
php artisan route:list | grep seo
```
- [ ] `/seo/health` route exists
- [ ] `/seo/test` route exists

### 5. Test Health Check
```bash
curl https://your-domain.com/seo/health
```
- [ ] Returns JSON with `status: "ok"`
- [ ] All 5 tables show `true`

### 6. Test Website Analysis
```bash
curl https://your-domain.com/seo/test
```
- [ ] Returns success response
- [ ] Contains project data with business_type, industry, etc.
- [ ] No errors in response

---

## Database Verification

### Access Database (Coolify Terminal)
```bash
php artisan tinker
```

### Check Tables
```php
>>> Schema::hasTable('seo_projects');
// Should return: true

>>> Schema::hasTable('seo_keywords');
// Should return: true

>>> Schema::hasTable('seo_generated_pages');
// Should return: true

>>> DB::table('seo_projects')->count();
// Should return: 1 (from test route)
```

- [ ] All SEO tables exist
- [ ] Test project was created

### Inspect Test Project
```php
>>> $project = \App\Extensions\SeoAutomation\System\Models\SeoProject::first();
>>> $project->business_type;
>>> $project->industry;
>>> print_r($project->analysis_data);
```

- [ ] Project has business_type
- [ ] Project has industry
- [ ] analysis_data contains Claude's analysis

---

## Browser Testing

### 1. Access Application
- [ ] Open https://your-domain.com
- [ ] MagicAI loads without errors
- [ ] Login page appears

### 2. Login
- [ ] Login with admin credentials
- [ ] Dashboard loads successfully

### 3. Test SEO Health (in browser)
- [ ] Visit: https://your-domain.com/seo/health
- [ ] JSON shows all tables as `true`

---

## Troubleshooting

### ❌ Build Failed
**Check Coolify build logs for:**
- Missing PHP extensions → Add to `nixpacks.toml`
- Composer errors → Run `composer install` locally first
- Permission errors → Check file permissions

### ❌ Database Connection Failed
**Fix:**
```bash
# In Coolify terminal
php artisan config:clear
php artisan cache:clear

# Test connection
php artisan tinker
>>> DB::connection()->getPdo();
```

### ❌ Routes Not Found
**Fix:**
```bash
php artisan route:clear
composer dump-autoload
php artisan config:clear
```

### ❌ Claude API Errors
**Check:**
- [ ] API key is correct in Coolify env vars
- [ ] API key has credits
- [ ] No typos in `ANTHROPIC_API_KEY`

**Test:**
```bash
php artisan tinker
>>> env('ANTHROPIC_API_KEY');
// Should show: sk-ant-api03-...
```

### ❌ Extension Not Loaded
**Fix:**
```bash
composer dump-autoload
php artisan config:cache
php artisan route:cache
```

**Verify:**
```bash
php artisan tinker
>>> app()->getProvider(\App\Extensions\SeoAutomation\SeoAutomationServiceProvider::class);
// Should return provider object
```

---

## Production Hardening

### Security
- [ ] Set `APP_DEBUG=false`
- [ ] Generate new `APP_KEY` if default was used
- [ ] Use strong database password
- [ ] Enable HTTPS (Coolify does this automatically)
- [ ] Set up firewall rules in Coolify

### Performance
- [ ] Enable opcache (in `php.ini`)
- [ ] Set up Redis for caching (optional)
- [ ] Configure queue workers (optional)
- [ ] Enable Gzip compression

### Monitoring
- [ ] Set up Coolify health checks
- [ ] Configure log rotation
- [ ] Set up database backups (daily)
- [ ] Monitor disk space

### Disable Test Routes (Production)
Edit `app/Extensions/SeoAutomation/Routes/web.php`:
```php
// Disable in production
if (!app()->environment('production')) {
    Route::get('/seo/test', function () { ... });
}
```

---

## Next Steps After Successful Deployment

Once all checks pass:

1. **Report Back:**
   - [ ] Confirm `/seo/health` returns all `true`
   - [ ] Confirm test project was created
   - [ ] Share any errors encountered

2. **Ready for Feature Development:**
   - [ ] Build KeywordResearchService
   - [ ] Build ContentGeneratorService
   - [ ] Build API endpoints
   - [ ] Build admin dashboard UI

3. **Optional Enhancements:**
   - [ ] Connect domain
   - [ ] Set up email notifications
   - [ ] Configure backups
   - [ ] Add monitoring

---

## Quick Reference Commands

**Coolify Terminal:**
```bash
# View logs
tail -f storage/logs/laravel.log

# Run migrations
php artisan migrate --force

# Clear all caches
php artisan optimize:clear

# Test database
php artisan tinker
>>> DB::connection()->getPdo();

# List routes
php artisan route:list

# Check extension loaded
php artisan tinker
>>> app(\App\Extensions\SeoAutomation\System\Services\WebsiteAnalyzerService::class);
```

**Browser URLs:**
- Health Check: `https://your-domain.com/seo/health`
- Test Analysis: `https://your-domain.com/seo/test`
- Dashboard: `https://your-domain.com/dashboard`

---

## Deployment Complete! 🎉

When all checkboxes are checked, you're ready to:
1. Start building the next services
2. Test with real client websites
3. Generate actual SEO content

Report back with results and we'll continue! 🚀
