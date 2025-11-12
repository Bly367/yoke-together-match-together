#!/bin/bash

# Generate Supabase types from database schema
# This script generates TypeScript types from your Supabase database schema

set -e

echo "🔍 Generating Supabase types..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI is not installed."
  echo "   Install it with: npm install -g supabase"
  echo "   Or visit: https://supabase.com/docs/guides/cli"
  exit 1
fi

# Check if project is linked
if [ ! -f "supabase/config.toml" ]; then
  echo "⚠️  Supabase config not found. Linking project..."
  echo "   Run: supabase link --project-ref YOUR_PROJECT_REF"
  echo "   Or: supabase init"
  exit 1
fi

# Generate types
echo "📝 Generating types from database schema..."
supabase gen types typescript --linked > src/integrations/supabase/types.ts

if [ $? -eq 0 ]; then
  echo "✅ Types generated successfully!"
  echo "   File: src/integrations/supabase/types.ts"
else
  echo "❌ Failed to generate types"
  echo "   Make sure your project is linked: supabase link --project-ref YOUR_PROJECT_REF"
  exit 1
fi

