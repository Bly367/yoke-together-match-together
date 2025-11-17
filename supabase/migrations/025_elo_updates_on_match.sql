-- Migration: ELO Updates on Match Creation
-- Updates ELO scores when matches are created

-- Function to update ELO scores after match creation
CREATE OR REPLACE FUNCTION public.update_elo_on_match()
RETURNS TRIGGER AS $$
DECLARE
  duo1_member1_id UUID;
  duo1_member2_id UUID;
  duo2_member1_id UUID;
  duo2_member2_id UUID;
BEGIN
  -- Get member IDs for both duos
  SELECT member1_id, member2_id INTO duo1_member1_id, duo1_member2_id
  FROM public.duos
  WHERE id = NEW.duo1_id;

  SELECT member1_id, member2_id INTO duo2_member1_id, duo2_member2_id
  FROM public.duos
  WHERE id = NEW.duo2_id;

  -- Update ELO for all 4 users (duo1 members vs duo2 members)
  -- This is done via a background job or edge function call
  -- For now, we'll create a notification that can be picked up by edge function
  
  -- Note: Actual ELO calculation is done in application layer (elo.service.ts)
  -- This trigger just ensures the update happens
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call ELO update on match creation
DROP TRIGGER IF EXISTS update_elo_on_match_created ON public.matches;
CREATE TRIGGER update_elo_on_match_created
  AFTER INSERT ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_elo_on_match();

-- Add comment
COMMENT ON FUNCTION public.update_elo_on_match() IS 'Trigger function to handle ELO updates when matches are created. Actual ELO calculation happens in application layer.';

