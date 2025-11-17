/**
 * Script to check if database tables exist
 * Run with: npx tsx scripts/check-database.ts
 */
import { createClient } from '@supabase/supabase-js';

// SECURITY: Never hardcode credentials. Always use environment variables.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('\nPlease set these in your .env file or environment.');
  console.error('See SETUP_INSTRUCTIONS.md for details.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDatabase() {
  console.log('🔍 Checking database tables...\n');

  // Check if profiles table exists
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('❌ profiles table does NOT exist');
        console.log('   Error:', error.message);
      } else {
        console.log('⚠️  profiles table exists but has an error:', error.message);
      }
    } else {
      console.log('✅ profiles table EXISTS');
      console.log('   Count:', data);
    }
  } catch (err: any) {
    console.log('❌ Error checking profiles table:', err.message);
  }

  // Check other tables
  const tables = ['duos', 'swipes', 'matches', 'messages'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`❌ ${table} table does NOT exist`);
        } else {
          console.log(`⚠️  ${table} table exists but has an error:`, error.message);
        }
      } else {
        console.log(`✅ ${table} table EXISTS`);
      }
    } catch (err: any) {
      console.log(`❌ Error checking ${table} table:`, err.message);
    }
  }

  console.log('\n📋 Next steps:');
  console.log('1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. Run the setup-supabase-simple.sql script');
  console.log('3. Verify tables are created');
  console.log('4. Check RLS policies are enabled');
}

checkDatabase().catch(console.error);
