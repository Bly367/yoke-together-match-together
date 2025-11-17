-- Migration: Fix Function Search Path Security Issues
-- Date: 2024-12-19
-- Description: Fixes mutable search_path warnings for functions
--              Sets search_path = public to prevent search_path injection attacks
--              This is a security best practice recommended by Supabase

-- Fix update_game_sessions_updated_at function
CREATE OR REPLACE FUNCTION update_game_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_game_session_on_action function
CREATE OR REPLACE FUNCTION update_game_session_on_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.game_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a new profile for the new user
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Add comments explaining the security fix
COMMENT ON FUNCTION update_game_sessions_updated_at() IS 
'Updates game_sessions.updated_at timestamp. Uses SET search_path = public for security.';

COMMENT ON FUNCTION update_game_session_on_action() IS 
'Updates game_sessions.updated_at when actions are created. Uses SET search_path = public for security.';

COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates a profile when a new user signs up. Uses SET search_path = public for security.';

-- Verify functions have search_path set
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('update_game_sessions_updated_at', 'update_game_session_on_action', 'handle_new_user')
    AND p.proconfig IS NOT NULL
    AND 'search_path' = ANY(p.proconfig);
  
  IF func_count < 3 THEN
    RAISE WARNING 'Not all functions have search_path set. Expected 3, found %.', func_count;
  ELSE
    RAISE NOTICE '✅ All functions have search_path set correctly (found % functions)', func_count;
  END IF;
END $$;

