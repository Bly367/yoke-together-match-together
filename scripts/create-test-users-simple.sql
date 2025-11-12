-- SIMPLE VERSION: Create Test Users via Supabase Admin API
-- 
-- This script provides a simpler approach using Supabase's built-in functions
-- However, the easiest way is to create users through the app or Supabase Dashboard
--
-- RECOMMENDED APPROACH:
-- 1. Go to Supabase Dashboard > Authentication > Users > Add User
-- 2. Create these 4 users manually:
--    - test1@yoke.test / password123
--    - test2@yoke.test / password123  
--    - test3@yoke.test / password123
--    - test4@yoke.test / password123
-- 3. Then run scripts/create-test-accounts.sql to set up profiles, duos, and matches
--
-- OR use the app's signup flow to create the users, then run create-test-accounts.sql

-- Alternative: Use Supabase Management API (requires API key)
-- This is more complex and requires admin privileges
-- See: https://supabase.com/docs/reference/javascript/auth-admin-createuser

-- For now, this script just shows what needs to be created
SELECT 
  'To create test accounts:' as instruction,
  '1. Sign up through app OR use Supabase Dashboard > Authentication > Add User' as step1,
  '2. Create: test1@yoke.test, test2@yoke.test, test3@yoke.test, test4@yoke.test' as step2,
  '3. All with password: password123' as step3,
  '4. Then run: scripts/create-test-accounts.sql' as step4;

