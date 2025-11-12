#!/usr/bin/env node

/**
 * Generate Supabase types from database schema
 * 
 * This script generates TypeScript types from your Supabase database schema
 * using the Supabase CLI or REST API.
 * 
 * Usage:
 *   node scripts/generate-types.js
 * 
 * Requirements:
 *   - Supabase CLI installed: npm install -g supabase
 *   - Project linked: supabase link --project-ref YOUR_PROJECT_REF
 *   - Or set SUPABASE_URL and SUPABASE_ANON_KEY environment variables
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const typesFile = join(projectRoot, 'src/integrations/supabase/types.ts');

console.log('🔍 Generating Supabase types...');

// Check if Supabase CLI is installed
try {
  execSync('supabase --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Supabase CLI is not installed.');
  console.error('   Install it with: npm install -g supabase');
  console.error('   Or visit: https://supabase.com/docs/guides/cli');
  process.exit(1);
}

// Check if project is linked
try {
  execSync('supabase status', { stdio: 'ignore', cwd: projectRoot });
} catch (error) {
  console.warn('⚠️  Supabase project may not be linked.');
  console.warn('   Run: supabase link --project-ref YOUR_PROJECT_REF');
  console.warn('   Or set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
}

// Generate types
try {
  console.log('📝 Generating types from database schema...');
  const types = execSync('supabase gen types typescript --linked', {
    encoding: 'utf-8',
    cwd: projectRoot,
  });

  writeFileSync(typesFile, types, 'utf-8');
  console.log('✅ Types generated successfully!');
  console.log(`   File: ${typesFile}`);
} catch (error) {
  console.error('❌ Failed to generate types');
  console.error('   Error:', error.message);
  console.error('   Make sure your project is linked: supabase link --project-ref YOUR_PROJECT_REF');
  process.exit(1);
}

