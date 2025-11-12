-- Fix Duo Active Status
-- Ensures only one duo per user is active at a time
-- Run this if you have multiple active duos for the same user

-- For each user, keep only the most recently created duo as active
-- and deactivate all others
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

-- Show summary
SELECT 
  'Fixed Duo Active Status' as status,
  COUNT(*) FILTER (WHERE is_active = true) as active_duos,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_duos,
  COUNT(*) as total_duos
FROM public.duos;

-- Show duos by user to verify
SELECT 
  p.email,
  p.name,
  COUNT(*) FILTER (WHERE d.is_active = true) as active_duo_count,
  COUNT(*) FILTER (WHERE d.is_active = false) as inactive_duo_count,
  COUNT(*) as total_duos
FROM public.profiles p
LEFT JOIN public.duos d ON (d.member1_id = p.id OR d.member2_id = p.id)
WHERE p.email LIKE 'test%@yoke.test'
GROUP BY p.id, p.email, p.name
ORDER BY p.email;

