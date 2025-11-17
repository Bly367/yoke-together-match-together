#!/bin/bash
# Script to check for untracked files that might be needed for builds
# Run this before committing to ensure all necessary files are tracked

echo "🔍 Checking for untracked files that might break builds..."

# Check for untracked TypeScript/TSX files in critical directories
UNTRACKED_SERVICES=$(find src/services -name "*.ts" -type f | while read f; do git ls-files --error-unmatch "$f" >/dev/null 2>&1 || echo "$f"; done)
UNTRACKED_COMPONENTS=$(find src/components -name "*.tsx" -type f | while read f; do git ls-files --error-unmatch "$f" >/dev/null 2>&1 || echo "$f"; done)
UNTRACKED_HOOKS=$(find src/hooks -name "*.ts" -type f | while read f; do git ls-files --error-unmatch "$f" >/dev/null 2>&1 || echo "$f"; done)
UNTRACKED_MIGRATIONS=$(find supabase/migrations -name "*.sql" -type f | while read f; do git ls-files --error-unmatch "$f" >/dev/null 2>&1 || echo "$f"; done)

if [ -n "$UNTRACKED_SERVICES" ] || [ -n "$UNTRACKED_COMPONENTS" ] || [ -n "$UNTRACKED_HOOKS" ] || [ -n "$UNTRACKED_MIGRATIONS" ]; then
    echo "⚠️  Found untracked files that might be needed for builds:"
    echo ""
    
    if [ -n "$UNTRACKED_SERVICES" ]; then
        echo "📦 Services:"
        echo "$UNTRACKED_SERVICES"
        echo ""
    fi
    
    if [ -n "$UNTRACKED_COMPONENTS" ]; then
        echo "🧩 Components:"
        echo "$UNTRACKED_COMPONENTS"
        echo ""
    fi
    
    if [ -n "$UNTRACKED_HOOKS" ]; then
        echo "🪝 Hooks:"
        echo "$UNTRACKED_HOOKS"
        echo ""
    fi
    
    if [ -n "$UNTRACKED_MIGRATIONS" ]; then
        echo "🗄️  Migrations:"
        echo "$UNTRACKED_MIGRATIONS"
        echo ""
    fi
    
    echo "💡 Tip: Run 'git add' on these files if they're needed for the build"
    exit 1
else
    echo "✅ All critical files are tracked!"
    exit 0
fi

