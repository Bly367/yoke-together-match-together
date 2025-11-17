-- Create Test Accounts (test5@yoke.test through test20@yoke.test)
-- 
-- IMPORTANT: You need to create the auth users FIRST through:
-- 1. Supabase Dashboard > Authentication > Users > Add User
-- 2. OR use the app's signup flow
-- 3. OR run scripts/create-auth-users-5-20.sql (if using Supabase Admin API)
--
-- All users should have password: password123
--
-- After creating auth users, run this script to populate profiles, preferences, interests, duos, and matches

-- Check if test users exist before proceeding
DO $$
DECLARE
  user_count INTEGER;
  required_emails TEXT[] := ARRAY[
    'test5@yoke.test', 'test6@yoke.test', 'test7@yoke.test', 'test8@yoke.test',
    'test9@yoke.test', 'test10@yoke.test', 'test11@yoke.test', 'test12@yoke.test',
    'test13@yoke.test', 'test14@yoke.test', 'test15@yoke.test', 'test16@yoke.test',
    'test17@yoke.test', 'test18@yoke.test', 'test19@yoke.test', 'test20@yoke.test'
  ];
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE email = ANY(required_emails);
  
  IF user_count < 16 THEN
    RAISE EXCEPTION 'Missing test users. Please create auth users first. Found % out of 16 users. Create users test5@yoke.test through test20@yoke.test with password: password123', user_count;
  END IF;
  
  RAISE NOTICE 'Found % test users. Proceeding with profile setup...', user_count;
END $$;

-- ============================================================================
-- CREATE PROFILES WITH REALISTIC DATING APP DATA
-- ============================================================================

-- Test 5: Emma - Woman, 24, likes men
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test5@yoke.test', 'Emma', 24, 
  'Yoga instructor and wellness enthusiast. Love morning hikes and matcha lattes. Looking for someone who values health and adventure!',
  'woman', 'men', 65, 'bachelors', 'spiritual', 'moderate', 'socially', 'never', 'daily', 'serious-relationship', 'no', 'yes', 
  ARRAY['en', 'es'], 'white', 'Yoga Instructor', ARRAY['dog']
FROM auth.users u WHERE u.email = 'test5@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 6: James - Man, 29, likes women
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test6@yoke.test', 'James', 29,
  'Software engineer by day, rock climber by weekend. Passionate about tech, travel, and trying new cuisines. Let''s explore together!',
  'man', 'women', 72, 'bachelors', 'agnostic', 'liberal', 'socially', 'never', '3-5-times-week', 'serious-relationship', 'no', 'maybe',
  ARRAY['en'], 'asian', 'Software Engineer', ARRAY[]::TEXT[]
FROM auth.users u WHERE u.email = 'test6@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 7: Sophia - Woman, 26, likes men
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test7@yoke.test', 'Sophia', 26,
  'Marketing manager who loves art galleries, wine tastings, and spontaneous road trips. Looking for someone who appreciates the finer things in life.',
  'woman', 'men', 63, 'masters', 'christianity', 'moderate', 'socially', 'never', '1-2-times-week', 'serious-relationship', 'no', 'yes',
  ARRAY['en', 'fr'], 'white', 'Marketing Manager', ARRAY['cat']
FROM auth.users u WHERE u.email = 'test7@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 8: Michael - Man, 31, likes women
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test8@yoke.test', 'Michael', 31,
  'Doctor who enjoys running marathons and cooking Italian food. Looking for someone who shares my passion for fitness and good food.',
  'man', 'women', 70, 'phd', 'judaism', 'liberal', 'rarely', 'never', 'daily', 'serious-relationship', 'no', 'yes',
  ARRAY['en', 'he'], 'white', 'Physician', ARRAY['dog']
FROM auth.users u WHERE u.email = 'test8@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 9: Olivia - Woman, 23, likes men
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test9@yoke.test', 'Olivia', 23,
  'Grad student studying psychology. Love reading, coffee shops, and deep conversations. Seeking meaningful connections.',
  'woman', 'men', 64, 'masters', 'agnostic', 'very-liberal', 'socially', 'never', 'rarely', 'casual-dating', 'no', 'maybe',
  ARRAY['en'], 'hispanic', 'Graduate Student', ARRAY[]::TEXT[]
FROM auth.users u WHERE u.email = 'test9@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 10: David - Man, 28, likes women
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test10@yoke.test', 'David', 28,
  'Musician and music producer. Love jazz, indie rock, and discovering new artists. Looking for someone who appreciates good music and good vibes.',
  'man', 'women', 68, 'some-college', 'spiritual', 'moderate', 'often', 'never', 'rarely', 'casual-dating', 'no', 'maybe',
  ARRAY['en'], 'black', 'Musician', ARRAY[]::TEXT[]
FROM auth.users u WHERE u.email = 'test10@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 11: Isabella - Woman, 27, likes men
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test11@yoke.test', 'Isabella', 27,
  'Chef at a local restaurant. Passionate about food, travel, and trying new recipes. Looking for someone who loves food as much as I do!',
  'woman', 'men', 62, 'associates', 'christianity', 'moderate', 'socially', 'never', '3-5-times-week', 'serious-relationship', 'no', 'yes',
  ARRAY['en', 'es', 'it'], 'hispanic', 'Chef', ARRAY['cat', 'dog']
FROM auth.users u WHERE u.email = 'test11@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 12: William - Man, 30, likes women
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test12@yoke.test', 'William', 30,
  'Financial analyst who enjoys golf, fine dining, and weekend getaways. Looking for someone sophisticated and adventurous.',
  'man', 'women', 71, 'masters', 'christianity', 'conservative', 'socially', 'never', '1-2-times-week', 'serious-relationship', 'no', 'yes',
  ARRAY['en'], 'white', 'Financial Analyst', ARRAY[]::TEXT[]
FROM auth.users u WHERE u.email = 'test12@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 13: Ava - Woman, 25, likes men
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test13@yoke.test', 'Ava', 25,
  'Graphic designer and photographer. Love art, music festivals, and exploring the city. Looking for someone creative and fun!',
  'woman', 'men', 66, 'bachelors', 'atheist', 'liberal', 'socially', 'never', '3-5-times-week', 'casual-dating', 'no', 'maybe',
  ARRAY['en'], 'asian', 'Graphic Designer', ARRAY['cat']
FROM auth.users u WHERE u.email = 'test13@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 14: Alexander - Man, 32, likes women
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test14@yoke.test', 'Alexander', 32,
  'Architect who loves design, travel, and good architecture. Passionate about sustainable living and urban planning.',
  'man', 'women', 73, 'masters', 'agnostic', 'moderate', 'socially', 'never', '1-2-times-week', 'serious-relationship', 'no', 'yes',
  ARRAY['en', 'de'], 'white', 'Architect', ARRAY[]::TEXT[]
FROM auth.users u WHERE u.email = 'test14@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 15: Mia - Woman, 24, likes men
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test15@yoke.test', 'Mia', 24,
  'Elementary school teacher. Love kids, books, and weekend adventures. Looking for someone kind, patient, and family-oriented.',
  'woman', 'men', 61, 'bachelors', 'christianity', 'moderate', 'rarely', 'never', '1-2-times-week', 'serious-relationship', 'no', 'yes',
  ARRAY['en'], 'white', 'Teacher', ARRAY[]::TEXT[]
FROM auth.users u WHERE u.email = 'test15@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 16: Benjamin - Man, 27, likes women
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test16@yoke.test', 'Benjamin', 27,
  'Data scientist and AI enthusiast. Love coding, board games, and sci-fi movies. Looking for someone who shares my nerdy interests!',
  'man', 'women', 69, 'masters', 'atheist', 'liberal', 'socially', 'never', 'rarely', 'casual-dating', 'no', 'maybe',
  ARRAY['en'], 'asian', 'Data Scientist', ARRAY[]::TEXT[]
FROM auth.users u WHERE u.email = 'test16@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 17: Charlotte - Woman, 28, likes men
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test17@yoke.test', 'Charlotte', 28,
  'Lawyer who enjoys hiking, reading, and wine tasting. Looking for someone intelligent, ambitious, and adventurous.',
  'woman', 'men', 67, 'phd', 'agnostic', 'moderate', 'socially', 'never', '3-5-times-week', 'serious-relationship', 'no', 'yes',
  ARRAY['en', 'fr'], 'white', 'Attorney', ARRAY['dog']
FROM auth.users u WHERE u.email = 'test17@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 18: Lucas - Man, 26, likes women
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test18@yoke.test', 'Lucas', 26,
  'Personal trainer and fitness coach. Love CrossFit, healthy eating, and helping others reach their goals. Let''s get fit together!',
  'man', 'women', 70, 'bachelors', 'spiritual', 'moderate', 'rarely', 'never', 'daily', 'casual-dating', 'no', 'maybe',
  ARRAY['en'], 'hispanic', 'Personal Trainer', ARRAY[]::TEXT[]
FROM auth.users u WHERE u.email = 'test18@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 19: Amelia - Woman, 29, likes men
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test19@yoke.test', 'Amelia', 29,
  'Nurse who loves traveling, trying new foods, and spending time with friends. Looking for someone caring and fun-loving.',
  'woman', 'men', 65, 'bachelors', 'christianity', 'moderate', 'socially', 'never', '1-2-times-week', 'serious-relationship', 'no', 'yes',
  ARRAY['en'], 'white', 'Registered Nurse', ARRAY['cat']
FROM auth.users u WHERE u.email = 'test19@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- Test 20: Henry - Man, 33, likes women
INSERT INTO public.profiles (id, email, name, age, bio, gender, preference, height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity, occupation, pets)
SELECT u.id, 'test20@yoke.test', 'Henry', 33,
  'Entrepreneur and startup founder. Love innovation, networking, and building things. Looking for someone ambitious and supportive.',
  'man', 'women', 72, 'masters', 'agnostic', 'moderate', 'socially', 'never', '3-5-times-week', 'serious-relationship', 'no', 'yes',
  ARRAY['en'], 'white', 'Entrepreneur', ARRAY['dog']
FROM auth.users u WHERE u.email = 'test20@yoke.test'
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, age=EXCLUDED.age, bio=EXCLUDED.bio, gender=EXCLUDED.gender, preference=EXCLUDED.preference,
  height_inches=EXCLUDED.height_inches, education_level=EXCLUDED.education_level, religion=EXCLUDED.religion, political_views=EXCLUDED.political_views,
  drinking_habit=EXCLUDED.drinking_habit, smoking_habit=EXCLUDED.smoking_habit, exercise_frequency=EXCLUDED.exercise_frequency,
  relationship_goal=EXCLUDED.relationship_goal, has_kids=EXCLUDED.has_kids, wants_kids=EXCLUDED.wants_kids, languages=EXCLUDED.languages,
  ethnicity=EXCLUDED.ethnicity, occupation=EXCLUDED.occupation, pets=EXCLUDED.pets;

-- ============================================================================
-- CREATE USER PREFERENCES (Matching Preferences)
-- ============================================================================

-- Test 5: Emma - prefers men 25-32, max 30 miles, height 68-76 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 25, 32, 30, 68, 76, ARRAY['bachelors', 'masters'], ARRAY['spiritual', 'agnostic', 'christianity'], ARRAY['moderate', 'liberal'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'mixed']
FROM public.profiles p WHERE p.email = 'test5@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 6: James - prefers women 23-30, max 50 miles, height 60-68 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 23, 30, 50, 60, 68, ARRAY['bachelors', 'masters', 'some-college'], ARRAY['agnostic', 'spiritual', 'atheist'], ARRAY['liberal', 'moderate'], 
  ARRAY['socially', 'rarely', 'often'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week', 'rarely'], ARRAY['serious-relationship', 'casual-dating'], 'no', 'either', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test6@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 7: Sophia - prefers men 26-35, max 40 miles, height 68-75 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 26, 35, 40, 68, 75, ARRAY['bachelors', 'masters', 'phd'], ARRAY['christianity', 'agnostic', 'spiritual'], ARRAY['moderate', 'liberal', 'conservative'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en', 'fr'], ARRAY['white', 'hispanic', 'asian', 'mixed']
FROM public.profiles p WHERE p.email = 'test7@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 8: Michael - prefers women 24-32, max 35 miles, height 60-67 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 24, 32, 35, 60, 67, ARRAY['bachelors', 'masters', 'phd'], ARRAY['judaism', 'agnostic', 'christianity'], ARRAY['liberal', 'moderate'], 
  ARRAY['rarely', 'socially', 'never'], ARRAY['never'], ARRAY['daily', '3-5-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test8@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 9: Olivia - prefers men 22-30, max 50 miles, height 66-74 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 22, 30, 50, 66, 74, ARRAY['bachelors', 'masters', 'some-college'], ARRAY['agnostic', 'atheist', 'spiritual'], ARRAY['very-liberal', 'liberal', 'moderate'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week', 'rarely'], ARRAY['casual-dating', 'serious-relationship'], 'no', 'either', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test9@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 10: David - prefers women 21-30, max 60 miles, height 58-66 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 21, 30, 60, 58, 66, ARRAY['some-college', 'bachelors', 'masters'], ARRAY['spiritual', 'agnostic', 'atheist'], ARRAY['moderate', 'liberal'], 
  ARRAY['often', 'socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week', 'rarely'], ARRAY['casual-dating', 'serious-relationship'], 'no', 'either', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test10@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 11: Isabella - prefers men 26-34, max 45 miles, height 67-75 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 26, 34, 45, 67, 75, ARRAY['associates', 'bachelors', 'masters'], ARRAY['christianity', 'spiritual'], ARRAY['moderate', 'liberal'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en', 'es'], ARRAY['white', 'hispanic', 'asian', 'mixed']
FROM public.profiles p WHERE p.email = 'test11@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 12: William - prefers women 25-33, max 40 miles, height 61-68 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 25, 33, 40, 61, 68, ARRAY['bachelors', 'masters', 'phd'], ARRAY['christianity', 'agnostic'], ARRAY['conservative', 'moderate'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'mixed']
FROM public.profiles p WHERE p.email = 'test12@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 13: Ava - prefers men 23-31, max 50 miles, height 66-74 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 23, 31, 50, 66, 74, ARRAY['bachelors', 'masters', 'some-college'], ARRAY['atheist', 'agnostic', 'spiritual'], ARRAY['liberal', 'very-liberal', 'moderate'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['casual-dating', 'serious-relationship'], 'no', 'either', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test13@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 14: Alexander - prefers women 24-32, max 50 miles, height 60-68 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 24, 32, 50, 60, 68, ARRAY['bachelors', 'masters', 'phd'], ARRAY['agnostic', 'spiritual', 'atheist'], ARRAY['moderate', 'liberal'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test14@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 15: Mia - prefers men 24-32, max 35 miles, height 67-75 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 24, 32, 35, 67, 75, ARRAY['bachelors', 'masters'], ARRAY['christianity', 'agnostic'], ARRAY['moderate', 'conservative'], 
  ARRAY['rarely', 'socially', 'never'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test15@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 16: Benjamin - prefers women 22-30, max 50 miles, height 58-66 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 22, 30, 50, 58, 66, ARRAY['bachelors', 'masters', 'some-college'], ARRAY['atheist', 'agnostic'], ARRAY['liberal', 'very-liberal', 'moderate'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week', 'rarely'], ARRAY['casual-dating', 'serious-relationship'], 'no', 'either', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test16@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 17: Charlotte - prefers men 27-35, max 40 miles, height 68-76 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 27, 35, 40, 68, 76, ARRAY['bachelors', 'masters', 'phd'], ARRAY['agnostic', 'spiritual', 'christianity'], ARRAY['moderate', 'liberal'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en', 'fr'], ARRAY['white', 'hispanic', 'asian', 'mixed']
FROM public.profiles p WHERE p.email = 'test17@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 18: Lucas - prefers women 22-30, max 50 miles, height 58-66 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 22, 30, 50, 58, 66, ARRAY['bachelors', 'some-college'], ARRAY['spiritual', 'agnostic', 'christianity'], ARRAY['moderate', 'liberal'], 
  ARRAY['rarely', 'socially', 'never'], ARRAY['never'], ARRAY['daily', '3-5-times-week'], ARRAY['casual-dating', 'serious-relationship'], 'no', 'either', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test18@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 19: Amelia - prefers men 27-35, max 45 miles, height 68-75 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 27, 35, 45, 68, 75, ARRAY['bachelors', 'masters'], ARRAY['christianity', 'agnostic', 'spiritual'], ARRAY['moderate', 'liberal'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test19@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- Test 20: Henry - prefers women 26-34, max 50 miles, height 60-68 inches
INSERT INTO public.user_preferences (user_id, min_age, max_age, max_distance_miles, min_height_inches, max_height_inches, education_levels, religions, political_views, drinking_habits, smoking_habits, exercise_frequencies, relationship_goals, has_kids_preference, wants_kids_preference, languages, ethnicities)
SELECT p.id, 26, 34, 50, 60, 68, ARRAY['bachelors', 'masters', 'phd'], ARRAY['agnostic', 'spiritual', 'atheist'], ARRAY['moderate', 'liberal'], 
  ARRAY['socially', 'rarely'], ARRAY['never'], ARRAY['daily', '3-5-times-week', '1-2-times-week'], ARRAY['serious-relationship'], 'no', 'yes', 
  ARRAY['en'], ARRAY['white', 'hispanic', 'asian', 'black', 'mixed']
FROM public.profiles p WHERE p.email = 'test20@yoke.test'
ON CONFLICT (user_id) DO UPDATE SET min_age=EXCLUDED.min_age, max_age=EXCLUDED.max_age, max_distance_miles=EXCLUDED.max_distance_miles,
  min_height_inches=EXCLUDED.min_height_inches, max_height_inches=EXCLUDED.max_height_inches, education_levels=EXCLUDED.education_levels,
  religions=EXCLUDED.religions, political_views=EXCLUDED.political_views, drinking_habits=EXCLUDED.drinking_habits, smoking_habits=EXCLUDED.smoking_habits,
  exercise_frequencies=EXCLUDED.exercise_frequencies, relationship_goals=EXCLUDED.relationship_goals, has_kids_preference=EXCLUDED.has_kids_preference,
  wants_kids_preference=EXCLUDED.wants_kids_preference, languages=EXCLUDED.languages, ethnicities=EXCLUDED.ethnicities;

-- ============================================================================
-- CREATE USER INTERESTS
-- ============================================================================

-- Test 5: Emma - yoga, hiking, wellness
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'yoga' FROM public.profiles p WHERE p.email = 'test5@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'hiking' FROM public.profiles p WHERE p.email = 'test5@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'coffee' FROM public.profiles p WHERE p.email = 'test5@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'reading' FROM public.profiles p WHERE p.email = 'test5@yoke.test' ON CONFLICT DO NOTHING;

-- Test 6: James - rock climbing, technology, travel, cooking
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'rock-climbing' FROM public.profiles p WHERE p.email = 'test6@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'programming' FROM public.profiles p WHERE p.email = 'test6@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'international-travel' FROM public.profiles p WHERE p.email = 'test6@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'cooking' FROM public.profiles p WHERE p.email = 'test6@yoke.test' ON CONFLICT DO NOTHING;

-- Test 7: Sophia - art, wine, travel, fine dining
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'museums' FROM public.profiles p WHERE p.email = 'test7@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'wine' FROM public.profiles p WHERE p.email = 'test7@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'city-breaks' FROM public.profiles p WHERE p.email = 'test7@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'fine-dining' FROM public.profiles p WHERE p.email = 'test7@yoke.test' ON CONFLICT DO NOTHING;

-- Test 8: Michael - running, cooking, fitness
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'running' FROM public.profiles p WHERE p.email = 'test8@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'cooking' FROM public.profiles p WHERE p.email = 'test8@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'weightlifting' FROM public.profiles p WHERE p.email = 'test8@yoke.test' ON CONFLICT DO NOTHING;

-- Test 9: Olivia - reading, coffee, psychology
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'reading' FROM public.profiles p WHERE p.email = 'test9@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'coffee' FROM public.profiles p WHERE p.email = 'test9@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'writing' FROM public.profiles p WHERE p.email = 'test9@yoke.test' ON CONFLICT DO NOTHING;

-- Test 10: David - music, jazz, indie
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'jazz' FROM public.profiles p WHERE p.email = 'test10@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'indie' FROM public.profiles p WHERE p.email = 'test10@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'concerts' FROM public.profiles p WHERE p.email = 'test10@yoke.test' ON CONFLICT DO NOTHING;

-- Test 11: Isabella - cooking, food, travel
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'cooking' FROM public.profiles p WHERE p.email = 'test11@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'baking' FROM public.profiles p WHERE p.email = 'test11@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'international-travel' FROM public.profiles p WHERE p.email = 'test11@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'fine-dining' FROM public.profiles p WHERE p.email = 'test11@yoke.test' ON CONFLICT DO NOTHING;

-- Test 12: William - golf, fine dining, travel
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'fine-dining' FROM public.profiles p WHERE p.email = 'test12@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'wine' FROM public.profiles p WHERE p.email = 'test12@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'city-breaks' FROM public.profiles p WHERE p.email = 'test12@yoke.test' ON CONFLICT DO NOTHING;

-- Test 13: Ava - photography, art, music festivals
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'photography' FROM public.profiles p WHERE p.email = 'test13@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'museums' FROM public.profiles p WHERE p.email = 'test13@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'concerts' FROM public.profiles p WHERE p.email = 'test13@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'indie' FROM public.profiles p WHERE p.email = 'test13@yoke.test' ON CONFLICT DO NOTHING;

-- Test 14: Alexander - architecture, travel, design
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'international-travel' FROM public.profiles p WHERE p.email = 'test14@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'museums' FROM public.profiles p WHERE p.email = 'test14@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'reading' FROM public.profiles p WHERE p.email = 'test14@yoke.test' ON CONFLICT DO NOTHING;

-- Test 15: Mia - reading, teaching, family activities
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'reading' FROM public.profiles p WHERE p.email = 'test15@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'writing' FROM public.profiles p WHERE p.email = 'test15@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'hiking' FROM public.profiles p WHERE p.email = 'test15@yoke.test' ON CONFLICT DO NOTHING;

-- Test 16: Benjamin - programming, board games, sci-fi
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'programming' FROM public.profiles p WHERE p.email = 'test16@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'board-games' FROM public.profiles p WHERE p.email = 'test16@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'video-games' FROM public.profiles p WHERE p.email = 'test16@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'movies' FROM public.profiles p WHERE p.email = 'test16@yoke.test' ON CONFLICT DO NOTHING;

-- Test 17: Charlotte - hiking, reading, wine
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'hiking' FROM public.profiles p WHERE p.email = 'test17@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'reading' FROM public.profiles p WHERE p.email = 'test17@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'wine' FROM public.profiles p WHERE p.email = 'test17@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'fine-dining' FROM public.profiles p WHERE p.email = 'test17@yoke.test' ON CONFLICT DO NOTHING;

-- Test 18: Lucas - CrossFit, fitness, healthy eating
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'weightlifting' FROM public.profiles p WHERE p.email = 'test18@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'running' FROM public.profiles p WHERE p.email = 'test18@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'cooking' FROM public.profiles p WHERE p.email = 'test18@yoke.test' ON CONFLICT DO NOTHING;

-- Test 19: Amelia - travel, food, friends
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'international-travel' FROM public.profiles p WHERE p.email = 'test19@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'cooking' FROM public.profiles p WHERE p.email = 'test19@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'fine-dining' FROM public.profiles p WHERE p.email = 'test19@yoke.test' ON CONFLICT DO NOTHING;

-- Test 20: Henry - startups, innovation, networking
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'startups' FROM public.profiles p WHERE p.email = 'test20@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'programming' FROM public.profiles p WHERE p.email = 'test20@yoke.test' ON CONFLICT DO NOTHING;
INSERT INTO public.user_interests (user_id, interest) SELECT p.id, 'reading' FROM public.profiles p WHERE p.email = 'test20@yoke.test' ON CONFLICT DO NOTHING;

-- ============================================================================
-- CREATE DUOS (Pair users together)
-- ============================================================================

-- Duo: Emma (test5) & James (test6) - Adventure Tech Duo
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT u1.id, u2.id, 'Emma & James', 'Wellness Meets Tech', 
  'We combine wellness and technology - yoga sessions followed by coding projects!',
  ARRAY['yoga', 'hiking', 'programming', 'rock-climbing', 'coffee'], true
FROM auth.users u1, auth.users u2
WHERE u1.email = 'test5@yoke.test' AND u2.email = 'test6@yoke.test'
  AND NOT EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = u1.id AND d.member2_id = u2.id) OR (d.member1_id = u2.id AND d.member2_id = u1.id));

-- Duo: Sophia (test7) & Michael (test8) - Sophisticated Duo
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT u1.id, u2.id, 'Sophia & Michael', 'Fine Dining & Fitness', 
  'We love fine dining, art, and staying fit. Perfect balance of indulgence and health!',
  ARRAY['fine-dining', 'wine', 'museums', 'running', 'cooking'], true
FROM auth.users u1, auth.users u2
WHERE u1.email = 'test7@yoke.test' AND u2.email = 'test8@yoke.test'
  AND NOT EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = u1.id AND d.member2_id = u2.id) OR (d.member1_id = u2.id AND d.member2_id = u1.id));

-- Duo: Olivia (test9) & David (test10) - Creative Duo
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT u1.id, u2.id, 'Olivia & David', 'Music & Minds', 
  'Deep conversations over coffee, live music, and creative pursuits.',
  ARRAY['reading', 'coffee', 'jazz', 'indie', 'concerts', 'writing'], true
FROM auth.users u1, auth.users u2
WHERE u1.email = 'test9@yoke.test' AND u2.email = 'test10@yoke.test'
  AND NOT EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = u1.id AND d.member2_id = u2.id) OR (d.member1_id = u2.id AND d.member2_id = u1.id));

-- Duo: Isabella (test11) & William (test12) - Foodie Duo
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT u1.id, u2.id, 'Isabella & William', 'Culinary Adventures', 
  'Chef meets foodie - we explore the best restaurants and create amazing meals together!',
  ARRAY['cooking', 'baking', 'fine-dining', 'wine', 'international-travel'], true
FROM auth.users u1, auth.users u2
WHERE u1.email = 'test11@yoke.test' AND u2.email = 'test12@yoke.test'
  AND NOT EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = u1.id AND d.member2_id = u2.id) OR (d.member1_id = u2.id AND d.member2_id = u1.id));

-- Duo: Ava (test13) & Alexander (test14) - Creative Professionals
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT u1.id, u2.id, 'Ava & Alexander', 'Design & Architecture', 
  'Graphic designer and architect - we appreciate good design, art, and travel.',
  ARRAY['photography', 'museums', 'international-travel', 'reading', 'concerts'], true
FROM auth.users u1, auth.users u2
WHERE u1.email = 'test13@yoke.test' AND u2.email = 'test14@yoke.test'
  AND NOT EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = u1.id AND d.member2_id = u2.id) OR (d.member1_id = u2.id AND d.member2_id = u1.id));

-- Duo: Mia (test15) & Benjamin (test16) - Nerdy & Nurturing
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT u1.id, u2.id, 'Mia & Benjamin', 'Teachers & Tech', 
  'Elementary teacher and data scientist - we love learning, board games, and family time.',
  ARRAY['reading', 'board-games', 'programming', 'writing', 'video-games'], true
FROM auth.users u1, auth.users u2
WHERE u1.email = 'test15@yoke.test' AND u2.email = 'test16@yoke.test'
  AND NOT EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = u1.id AND d.member2_id = u2.id) OR (d.member1_id = u2.id AND d.member2_id = u1.id));

-- Duo: Charlotte (test17) & Lucas (test18) - Active Professionals
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT u1.id, u2.id, 'Charlotte & Lucas', 'Law & Fitness', 
  'Lawyer and personal trainer - we balance work, fitness, and adventure!',
  ARRAY['hiking', 'weightlifting', 'running', 'wine', 'fine-dining'], true
FROM auth.users u1, auth.users u2
WHERE u1.email = 'test17@yoke.test' AND u2.email = 'test18@yoke.test'
  AND NOT EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = u1.id AND d.member2_id = u2.id) OR (d.member1_id = u2.id AND d.member2_id = u1.id));

-- Duo: Amelia (test19) & Henry (test20) - Ambitious Duo
INSERT INTO public.duos (member1_id, member2_id, name, tagline, bio, interests, is_active)
SELECT u1.id, u2.id, 'Amelia & Henry', 'Healthcare & Innovation', 
  'Nurse and entrepreneur - we value helping others, innovation, and building meaningful connections.',
  ARRAY['international-travel', 'startups', 'cooking', 'reading', 'programming'], true
FROM auth.users u1, auth.users u2
WHERE u1.email = 'test19@yoke.test' AND u2.email = 'test20@yoke.test'
  AND NOT EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = u1.id AND d.member2_id = u2.id) OR (d.member1_id = u2.id AND d.member2_id = u1.id));

-- ============================================================================
-- CREATE SOME MATCHES BETWEEN DUOS
-- ============================================================================

-- Match: Emma & James (test5/test6) with Sophia & Michael (test7/test8)
INSERT INTO public.matches (duo1_id, duo2_id, matched_at, is_active)
SELECT LEAST(d1.id, d2.id), GREATEST(d1.id, d2.id), NOW(), true
FROM public.duos d1, public.duos d2
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id IN (d1.member1_id, d1.member2_id) AND u.email = 'test5@yoke.test')
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id IN (d2.member1_id, d2.member2_id) AND u.email = 'test7@yoke.test')
  AND d1.id != d2.id
  AND NOT EXISTS (SELECT 1 FROM public.matches m WHERE (m.duo1_id = LEAST(d1.id, d2.id) AND m.duo2_id = GREATEST(d1.id, d2.id)));

-- Match: Olivia & David (test9/test10) with Ava & Alexander (test13/test14)
INSERT INTO public.matches (duo1_id, duo2_id, matched_at, is_active)
SELECT LEAST(d1.id, d2.id), GREATEST(d1.id, d2.id), NOW(), true
FROM public.duos d1, public.duos d2
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id IN (d1.member1_id, d1.member2_id) AND u.email = 'test9@yoke.test')
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id IN (d2.member1_id, d2.member2_id) AND u.email = 'test13@yoke.test')
  AND d1.id != d2.id
  AND NOT EXISTS (SELECT 1 FROM public.matches m WHERE (m.duo1_id = LEAST(d1.id, d2.id) AND m.duo2_id = GREATEST(d1.id, d2.id)));

-- Match: Isabella & William (test11/test12) with Charlotte & Lucas (test17/test18)
INSERT INTO public.matches (duo1_id, duo2_id, matched_at, is_active)
SELECT LEAST(d1.id, d2.id), GREATEST(d1.id, d2.id), NOW(), true
FROM public.duos d1, public.duos d2
WHERE EXISTS (SELECT 1 FROM auth.users u WHERE u.id IN (d1.member1_id, d1.member2_id) AND u.email = 'test11@yoke.test')
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id IN (d2.member1_id, d2.member2_id) AND u.email = 'test17@yoke.test')
  AND d1.id != d2.id
  AND NOT EXISTS (SELECT 1 FROM public.matches m WHERE (m.duo1_id = LEAST(d1.id, d2.id) AND m.duo2_id = GREATEST(d1.id, d2.id)));

-- ============================================================================
-- SUMMARY AND VERIFICATION
-- ============================================================================

DO $$
DECLARE
  profile_count INTEGER;
  preference_count INTEGER;
  interest_count INTEGER;
  duo_count INTEGER;
  match_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE email LIKE 'test%@yoke.test' AND email >= 'test5@yoke.test';
  SELECT COUNT(*) INTO preference_count FROM public.user_preferences WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'test%@yoke.test' AND email >= 'test5@yoke.test');
  SELECT COUNT(*) INTO interest_count FROM public.user_interests WHERE user_id IN (SELECT id FROM public.profiles WHERE email LIKE 'test%@yoke.test' AND email >= 'test5@yoke.test');
  SELECT COUNT(*) INTO duo_count FROM public.duos WHERE is_active = true AND (member1_id IN (SELECT id FROM public.profiles WHERE email LIKE 'test%@yoke.test' AND email >= 'test5@yoke.test') OR member2_id IN (SELECT id FROM public.profiles WHERE email LIKE 'test%@yoke.test' AND email >= 'test5@yoke.test'));
  SELECT COUNT(*) INTO match_count FROM public.matches WHERE is_active = true;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Test Accounts Setup Complete (test5-test20)!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Profiles Created: %', profile_count;
  RAISE NOTICE 'Preferences Created: %', preference_count;
  RAISE NOTICE 'Interests Created: %', interest_count;
  RAISE NOTICE 'Active Duos: %', duo_count;
  RAISE NOTICE 'Active Matches: %', match_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;

-- Display test account summary
SELECT 
  p.email,
  p.name,
  p.age,
  p.gender,
  p.preference,
  p.occupation,
  'password123' as password,
  CASE WHEN EXISTS (SELECT 1 FROM public.duos d WHERE (d.member1_id = p.id OR d.member2_id = p.id) AND d.is_active = true) THEN '✅ Has Duo' ELSE '❌ No Duo' END as duo_status,
  CASE WHEN EXISTS (SELECT 1 FROM public.matches m JOIN public.duos d1 ON m.duo1_id = d1.id JOIN public.duos d2 ON m.duo2_id = d2.id WHERE m.is_active = true AND (d1.member1_id = p.id OR d1.member2_id = p.id OR d2.member1_id = p.id OR d2.member2_id = p.id)) THEN '✅ Has Match' ELSE '❌ No Match' END as match_status
FROM public.profiles p
WHERE p.email LIKE 'test%@yoke.test' AND p.email >= 'test5@yoke.test'
ORDER BY p.email;

