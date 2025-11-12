-- Verify Database Schema
-- Run this in Supabase SQL Editor to check if tables exist

-- Check if tables exist
SELECT 
    table_name,
    table_schema
FROM 
    information_schema.tables
WHERE 
    table_schema = 'public'
    AND table_name IN ('profiles', 'duos', 'swipes', 'matches', 'messages')
ORDER BY 
    table_name;

-- Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM 
    pg_tables
WHERE 
    schemaname = 'public'
    AND tablename IN ('profiles', 'duos', 'swipes', 'matches', 'messages');

-- Check if policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
    AND tablename IN ('profiles', 'duos', 'swipes', 'matches', 'messages')
ORDER BY 
    tablename, policyname;

-- Count records in each table (if they exist)
SELECT 'profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'duos', COUNT(*) FROM public.duos
UNION ALL
SELECT 'swipes', COUNT(*) FROM public.swipes
UNION ALL
SELECT 'matches', COUNT(*) FROM public.matches
UNION ALL
SELECT 'messages', COUNT(*) FROM public.messages;

