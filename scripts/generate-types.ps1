# Generate Supabase types from database schema
# PowerShell script for Windows

Write-Host "🔍 Generating Supabase types..." -ForegroundColor Cyan

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Host "❌ Supabase CLI is not installed." -ForegroundColor Red
  Write-Host "   Install it with: npm install -g supabase" -ForegroundColor Yellow
  Write-Host "   Or visit: https://supabase.com/docs/guides/cli" -ForegroundColor Yellow
  exit 1
}

# Check if project is linked
if (-not (Test-Path "supabase/config.toml")) {
  Write-Host "⚠️  Supabase config not found. Linking project..." -ForegroundColor Yellow
  Write-Host "   Run: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Yellow
  Write-Host "   Or: supabase init" -ForegroundColor Yellow
  exit 1
}

# Generate types
Write-Host "📝 Generating types from database schema..." -ForegroundColor Cyan
supabase gen types typescript --linked | Out-File -FilePath "src/integrations/supabase/types.ts" -Encoding utf8

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Types generated successfully!" -ForegroundColor Green
  Write-Host "   File: src/integrations/supabase/types.ts" -ForegroundColor Green
} else {
  Write-Host "❌ Failed to generate types" -ForegroundColor Red
  Write-Host "   Make sure your project is linked: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Yellow
  exit 1
}

