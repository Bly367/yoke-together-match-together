-- Migration: Enforce Single Active Duo Per User
-- Creates a trigger that automatically deactivates other duos when a duo is set to active
-- This ensures database-level enforcement of the "only one active duo per user" rule

-- Function to enforce single active duo per user
CREATE OR REPLACE FUNCTION enforce_single_active_duo()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if is_active is being set to true
  IF NEW.is_active = true THEN
    -- Deactivate all other active duos for member1
    UPDATE public.duos
    SET is_active = false, updated_at = NOW()
    WHERE (member1_id = NEW.member1_id OR member2_id = NEW.member1_id)
      AND id != NEW.id
      AND is_active = true;
    
    -- Deactivate all other active duos for member2
    UPDATE public.duos
    SET is_active = false, updated_at = NOW()
    WHERE (member1_id = NEW.member2_id OR member2_id = NEW.member2_id)
      AND id != NEW.id
      AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs BEFORE INSERT or UPDATE
DROP TRIGGER IF EXISTS enforce_single_active_duo_trigger ON public.duos;
CREATE TRIGGER enforce_single_active_duo_trigger
  BEFORE INSERT OR UPDATE OF is_active ON public.duos
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION enforce_single_active_duo();

-- Fix any existing data that violates the constraint
-- For each user, keep only the most recently created active duo
WITH user_duos AS (
  SELECT 
    d.id,
    d.member1_id as user_id,
    d.is_active,
    d.created_at,
    ROW_NUMBER() OVER (PARTITION BY d.member1_id ORDER BY d.created_at DESC) as rn
  FROM public.duos d
  WHERE d.is_active = true
  
  UNION ALL
  
  SELECT 
    d.id,
    d.member2_id as user_id,
    d.is_active,
    d.created_at,
    ROW_NUMBER() OVER (PARTITION BY d.member2_id ORDER BY d.created_at DESC) as rn
  FROM public.duos d
  WHERE d.is_active = true
),
duos_to_deactivate AS (
  SELECT DISTINCT id
  FROM user_duos
  WHERE rn > 1
)
UPDATE public.duos
SET is_active = false, updated_at = NOW()
WHERE id IN (SELECT id FROM duos_to_deactivate);

