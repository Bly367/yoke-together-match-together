-- Migration: Fix Function Search Path Security Issue
-- Sets search_path for functions to prevent search_path injection attacks
-- This is a security best practice recommended by Supabase

-- Fix get_current_profile_id function
-- We'll try multiple approaches to fix the function with search_path set
DO $$
DECLARE
  func_def TEXT;
  func_oid OID;
  func_name TEXT := 'get_current_profile_id';
  func_schema TEXT := 'public';
  func_args TEXT;
BEGIN
  -- Find the function OID and arguments
  SELECT p.oid, pg_get_function_identity_arguments(p.oid) INTO func_oid, func_args
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = func_schema
  AND p.proname = func_name
  LIMIT 1;
  
  IF func_oid IS NOT NULL THEN
    -- Get the function definition
    BEGIN
      SELECT pg_get_functiondef(func_oid) INTO func_def;
      
      IF func_def IS NOT NULL THEN
        -- Try to modify the function definition to add SET search_path
        -- Insert SET search_path = '' before the AS clause
        -- Match AS followed by dollar-quoted string delimiter
        func_def := regexp_replace(
          func_def,
          '(\s+)(AS\s+\$[a-zA-Z]*\$)',
          '\1SET search_path = ''''\2',
          'g'
        );
        
        -- If that didn't work, try inserting after LANGUAGE
        IF func_def NOT LIKE '%SET search_path%' THEN
          func_def := regexp_replace(
            func_def,
            '(LANGUAGE\s+\w+)(\s+)',
            '\1' || chr(10) || 'SET search_path = ''''\2',
            'g'
          );
        END IF;
        
        -- Drop the function first
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', 
          func_schema, func_name, COALESCE(func_args, ''));
        
        -- Execute the modified function definition
        EXECUTE func_def;
        
        RAISE NOTICE 'Function % fixed with search_path set', func_name;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not get/modify function definition: %', SQLERRM;
        -- Fall through to simple recreation
    END;
  END IF;
  
  -- If we couldn't fix it above, try simple recreation
  -- This handles the case where the function doesn't exist or the above failed
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = func_schema
    AND p.proname = func_name
    AND p.proconfig IS NOT NULL
    AND 'search_path' = ANY(p.proconfig)
  ) THEN
    BEGIN
      -- Drop any existing version (handle different signatures)
      DROP FUNCTION IF EXISTS public.get_current_profile_id() CASCADE;
      
      -- Recreate with search_path set
      -- Common pattern: returns auth.uid()
      -- Use $function$ tag to avoid conflict with outer DO block
      CREATE OR REPLACE FUNCTION public.get_current_profile_id()
      RETURNS UUID
      LANGUAGE sql
      SECURITY DEFINER
      SET search_path = ''
      AS $function$
        SELECT auth.uid();
      $function$;
      
      GRANT EXECUTE ON FUNCTION public.get_current_profile_id() TO authenticated;
      
      RAISE NOTICE 'Recreated function % with search_path set', func_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not recreate function %. Error: %. Manual fix may be required.', func_name, SQLERRM;
    END;
  END IF;
END $$;

-- Add comment
COMMENT ON FUNCTION public.get_current_profile_id() IS 'Returns the current user profile ID. Uses SET search_path = '' for security.';

