-- Create Test Accounts with Preferences for Testing
-- 
-- IMPORTANT: This script creates profiles, duos, and matches WITH preferences.
-- You need to create the auth users FIRST through the app's signup flow.
--
-- Steps:
-- 1. Sign up 4 test accounts through your app:
--    - test1@yoke.test / password123 (Alice - woman, likes men)
--    - test2@yoke.test / password123 (Bob - man, likes women)
--    - test3@yoke.test / password123 (Charlie - man, likes women)
--    - test4@yoke.test / password123 (Diana - woman, likes men)
--
-- 2. Run this script to create profiles with preferences, duos, matches, and sample messages
--
-- OR use the Supabase Dashboard > Authentication > Add User to create users manually
--
-- NOTE: This script uses SECURITY DEFINER to bypass RLS policies for setup.
-- Run this as a database admin or ensure RLS policies allow these operations.

-- Check if test users exist before proceeding
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE email IN ('test1@yoke.test', 'test2@yoke.test', 'test3@yoke.test', 'test4@yoke.test');
  
  IF user_count < 4 THEN
    RAISE EXCEPTION 'Missing test users. Please create auth users first. Found % out of 4 users.', user_count;
  END IF;
  
  RAISE NOTICE 'Found % test users. Proceeding with setup...', user_count;
END $$;

-- Create or update profiles WITH preferences
-- Alice: woman, likes men
INSERT INTO public.profiles (id, email, name, age, bio, photo_url, gender, preference)
SELECT 
  u.id,
  'test1@yoke.test',
  'Alice',
  25,
  'Love hiking and coffee! Looking for adventure buddies.',
  NULL,
  'woman',
  'men'
FROM auth.users u
WHERE u.email = 'test1@yoke.test'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  bio = EXCLUDED.bio,
  gender = EXCLUDED.gender,
  preference = EXCLUDED.preference;

-- Bob: man, likes women
INSERT INTO public.profiles (id, email, name, age, bio, photo_url, gender, preference)
SELECT 
  u.id,
  'test2@yoke.test',
  'Bob',
  28,
  'Music enthusiast and foodie. Always up for trying new restaurants!',
  NULL,
  'man',
  'women'
FROM auth.users u
WHERE u.email = 'test2@yoke.test'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  bio = EXCLUDED.bio,
  gender = EXCLUDED.gender,
  preference = EXCLUDED.preference;

-- Charlie: man, likes women
INSERT INTO public.profiles (id, email, name, age, bio, photo_url, gender, preference)
SELECT 
  u.id,
  'test3@yoke.test',
  'Charlie',
  26,
  'Tech geek and board game lover. Let''s play!',
  NULL,
  'man',
  'women'
FROM auth.users u
WHERE u.email = 'test3@yoke.test'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  bio = EXCLUDED.bio,
  gender = EXCLUDED.gender,
  preference = EXCLUDED.preference;

-- Diana: woman, likes men
INSERT INTO public.profiles (id, email, name, age, bio, photo_url, gender, preference)
SELECT 
  u.id,
  'test4@yoke.test',
  'Diana',
  27,
  'Yoga instructor and bookworm. Seeking meaningful connections.',
  NULL,
  'woman',
  'men'
FROM auth.users u
WHERE u.email = 'test4@yoke.test'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  age = EXCLUDED.age,
  bio = EXCLUDED.bio,
  gender = EXCLUDED.gender,
  preference = EXCLUDED.preference;

-- Create duos
-- Note: Duos table doesn't have a unique constraint on (member1_id, member2_id),
-- so we check for existing duos before inserting to avoid duplicates

-- Duo 1: Alice (woman, likes men) & Bob (man, likes women)
-- This duo should match with duos containing at least one person of opposite gender
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT 
  u1.id,
  u2.id,
  'Alice & Bob',
  'Adventure Seekers',
  'We love exploring new places and trying new things together!',
  ARRAY['hiking', 'coffee', 'travel', 'food'],
  true
FROM auth.users u1
JOIN auth.users u2 ON u2.email = 'test2@yoke.test'
WHERE u1.email = 'test1@yoke.test'
  AND NOT EXISTS (
    SELECT 1 FROM public.duos d
    WHERE (d.member1_id = u1.id AND d.member2_id = u2.id)
       OR (d.member1_id = u2.id AND d.member2_id = u1.id)
  );

-- Duo 2: Charlie (man, likes women) & Diana (woman, likes men)
-- This duo should match with duos containing at least one person of opposite gender
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT 
  u1.id,
  u2.id,
  'Charlie & Diana',
  'Game Night Duo',
  'We enjoy board games, tech talks, and deep conversations.',
  ARRAY['board games', 'technology', 'yoga', 'books'],
  true
FROM auth.users u1
JOIN auth.users u2 ON u2.email = 'test4@yoke.test'
WHERE u1.email = 'test3@yoke.test'
  AND NOT EXISTS (
    SELECT 1 FROM public.duos d
    WHERE (d.member1_id = u1.id AND d.member2_id = u2.id)
       OR (d.member1_id = u2.id AND d.member2_id = u1.id)
  );

-- Duo 3: Alice & Charlie (NEW - not matched with Alice & Bob duo)
-- This creates a second duo for Alice to test multiple duos functionality
-- Note: This will be inactive since Alice already has an active duo (Alice & Bob)
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT 
  u1.id,
  u2.id,
  'Alice & Charlie',
  'Adventure Tech',
  'Combining our love for adventure and technology!',
  ARRAY['hiking', 'technology', 'coffee', 'board games'],
  false  -- Inactive since Alice already has an active duo
FROM auth.users u1
JOIN auth.users u2 ON u2.email = 'test3@yoke.test'
WHERE u1.email = 'test1@yoke.test'
  AND NOT EXISTS (
    SELECT 1 FROM public.duos d
    WHERE (d.member1_id = u1.id AND d.member2_id = u2.id)
       OR (d.member1_id = u2.id AND d.member2_id = u1.id)
  );

-- Create a match between the two duos
-- These duos should match because:
-- - Duo 1 has Alice (woman) and Bob (man)
-- - Duo 2 has Charlie (man) and Diana (woman)
-- - Alice likes men (Charlie matches)
-- - Bob likes women (Diana matches)
-- - Charlie likes women (Alice matches)
-- - Diana likes men (Bob matches)
INSERT INTO public.matches (duo1_id, duo2_id, matched_at, is_active)
SELECT 
  LEAST(d1.id, d2.id) as duo1_id,
  GREATEST(d1.id, d2.id) as duo2_id,
  NOW(),
  true
FROM public.duos d1
JOIN public.duos d2 ON d1.id != d2.id
WHERE EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id IN (d1.member1_id, d1.member2_id)
    AND u.email = 'test1@yoke.test'
  )
  AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id IN (d2.member1_id, d2.member2_id)
    AND u.email = 'test3@yoke.test'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.duo1_id = LEAST(d1.id, d2.id) AND m.duo2_id = GREATEST(d1.id, d2.id))
       OR (m.duo1_id = GREATEST(d1.id, d2.id) AND m.duo2_id = LEAST(d1.id, d2.id))
  );

-- Create some sample messages for testing
-- Only create messages if they don't already exist (check by content and match_id)
WITH test_match AS (
  SELECT m.id as match_id
  FROM public.matches m
  WHERE EXISTS (
      SELECT 1 FROM public.duos d
      JOIN auth.users u ON u.id IN (d.member1_id, d.member2_id)
      WHERE d.id = m.duo1_id AND u.email = 'test1@yoke.test'
    )
    AND EXISTS (
      SELECT 1 FROM public.duos d
      JOIN auth.users u ON u.id IN (d.member1_id, d.member2_id)
      WHERE d.id = m.duo2_id AND u.email = 'test3@yoke.test'
    )
  LIMIT 1
),
test_users AS (
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.email IN ('test1@yoke.test', 'test3@yoke.test')
),
sample_messages AS (
  SELECT * FROM (VALUES
    ('Hey! Nice to match with you! 👋', 10, 'test1@yoke.test'),
    ('Hi there! Excited to chat!', 9, 'test3@yoke.test'),
    ('What are you up to today?', 8, 'test1@yoke.test'),
    ('Just finished a great hike!', 7, 'test1@yoke.test'),
    ('That sounds amazing! Where did you go?', 6, 'test3@yoke.test'),
    ('We went to the local nature trail. The views were incredible!', 5, 'test1@yoke.test'),
    ('I love that trail! We should go together sometime.', 4, 'test3@yoke.test'),
    ('Absolutely! That would be fun!', 3, 'test1@yoke.test'),
    ('When are you free this weekend?', 2, 'test3@yoke.test'),
    ('Saturday morning works for us!', 1, 'test1@yoke.test')
  ) AS msg(content, offset_minutes, sender_email)
)
INSERT INTO public.messages (match_id, sender_id, content, created_at)
SELECT 
  tm.match_id,
  tu.id,
  sm.content,
  NOW() - (sm.offset_minutes || ' minutes')::INTERVAL
FROM test_match tm
CROSS JOIN test_users tu
CROSS JOIN sample_messages sm
WHERE tu.email = sm.sender_email
  AND NOT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.match_id = tm.match_id
      AND m.sender_id = tu.id
      AND m.content = sm.content
  );

-- Display summary
DO $$
DECLARE
  test_user_count INTEGER;
  duo_count INTEGER;
  match_count INTEGER;
  message_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO test_user_count
  FROM public.profiles
  WHERE email LIKE 'test%@yoke.test';
  
  SELECT COUNT(*) INTO duo_count
  FROM public.duos
  WHERE is_active = true;
  
  SELECT COUNT(*) INTO match_count
  FROM public.matches
  WHERE is_active = true;
  
  SELECT COUNT(*) INTO message_count
  FROM public.messages;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Test Setup Complete with Preferences!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Test Users: %', test_user_count;
  RAISE NOTICE 'Active Duos: %', duo_count;
  RAISE NOTICE 'Active Matches: %', match_count;
  RAISE NOTICE 'Total Messages: %', message_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Display summary table
SELECT 
  '✅ Test Setup Complete with Preferences' as status,
  COUNT(*) FILTER (WHERE email LIKE 'test%@yoke.test') as test_users,
  (SELECT COUNT(*) FROM public.duos WHERE is_active = true) as active_duos,
  (SELECT COUNT(*) FROM public.matches WHERE is_active = true) as active_matches,
  (SELECT COUNT(*) FROM public.messages) as total_messages
FROM public.profiles
WHERE email LIKE 'test%@yoke.test';

-- Show test account info WITH preferences
SELECT 
  p.email,
  p.name,
  p.age,
  p.gender,
  p.preference,
  'password123' as password,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.duos d
      WHERE (d.member1_id = p.id OR d.member2_id = p.id)
      AND d.is_active = true
    ) THEN '✅ Has Duo'
    ELSE '❌ No Duo'
  END as duo_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.duos d1 ON m.duo1_id = d1.id
      JOIN public.duos d2 ON m.duo2_id = d2.id
      WHERE m.is_active = true
        AND (d1.member1_id = p.id OR d1.member2_id = p.id 
             OR d2.member1_id = p.id OR d2.member2_id = p.id)
    ) THEN '✅ Has Match'
    ELSE '❌ No Match'
  END as match_status,
  (
    SELECT COUNT(*)
    FROM public.messages m
    JOIN public.matches mt ON m.match_id = mt.id
    JOIN public.duos d1 ON mt.duo1_id = d1.id
    JOIN public.duos d2 ON mt.duo2_id = d2.id
    WHERE m.sender_id = p.id
      AND (d1.member1_id = p.id OR d1.member2_id = p.id 
           OR d2.member1_id = p.id OR d2.member2_id = p.id)
  ) as message_count
FROM public.profiles p
WHERE p.email LIKE 'test%@yoke.test'
ORDER BY p.email;

-- Show preference matching test info
SELECT 
  'Preference Matching Test' as test_name,
  d1.name as duo1_name,
  p1a.name || ' (' || p1a.gender || ', likes ' || p1a.preference || ')' as duo1_member1,
  p1b.name || ' (' || p1b.gender || ', likes ' || p1b.preference || ')' as duo1_member2,
  d2.name as duo2_name,
  p2a.name || ' (' || p2a.gender || ', likes ' || p2a.preference || ')' as duo2_member1,
  p2b.name || ' (' || p2b.gender || ', likes ' || p2b.preference || ')' as duo2_member2,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.duo1_id = d1.id AND m.duo2_id = d2.id)
         OR (m.duo1_id = d2.id AND m.duo2_id = d1.id)
    ) THEN '✅ Matched'
    ELSE '❌ Not Matched'
  END as match_status
FROM public.duos d1
JOIN public.duos d2 ON d1.id != d2.id
JOIN public.profiles p1a ON p1a.id = d1.member1_id
JOIN public.profiles p1b ON p1b.id = d1.member2_id
JOIN public.profiles p2a ON p2a.id = d2.member1_id
JOIN public.profiles p2b ON p2b.id = d2.member2_id
WHERE d1.is_active = true AND d2.is_active = true
ORDER BY d1.name, d2.name;
