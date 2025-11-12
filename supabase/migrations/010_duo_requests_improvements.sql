-- Migration: Duo Requests Improvements
-- Adds duo details columns, expiration, and improves the trigger

-- Add duo details columns to store the proposed duo information
ALTER TABLE public.duo_requests
  ADD COLUMN IF NOT EXISTS duo_name TEXT,
  ADD COLUMN IF NOT EXISTS duo_tagline TEXT,
  ADD COLUMN IF NOT EXISTS duo_bio TEXT,
  ADD COLUMN IF NOT EXISTS duo_interests TEXT[],
  ADD COLUMN IF NOT EXISTS duo_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for expiration queries
CREATE INDEX IF NOT EXISTS idx_duo_requests_expires_at 
ON public.duo_requests(expires_at) 
WHERE status = 'pending' AND expires_at IS NOT NULL;

-- Update the trigger function to use stored duo details
CREATE OR REPLACE FUNCTION create_duo_on_request_accept()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Check if duo already exists between these two users
    IF NOT EXISTS (
      SELECT 1 FROM public.duos
      WHERE (member1_id = NEW.requester_id AND member2_id = NEW.requested_id)
         OR (member1_id = NEW.requested_id AND member2_id = NEW.requester_id)
    ) THEN
      -- Create the duo with details from the request
      INSERT INTO public.duos (
        member1_id, 
        member2_id, 
        name,
        tagline,
        bio,
        interests,
        photo_url,
        is_active
      )
      VALUES (
        NEW.requester_id, 
        NEW.requested_id,
        NULLIF(NEW.duo_name, ''),
        NULLIF(NEW.duo_tagline, ''),
        NULLIF(NEW.duo_bio, ''),
        CASE WHEN NEW.duo_interests IS NOT NULL AND array_length(NEW.duo_interests, 1) > 0 
             THEN NEW.duo_interests 
             ELSE NULL END,
        NULLIF(NEW.duo_photo_url, ''),
        true
      )
      ON CONFLICT DO NOTHING; -- Prevent duplicate if somehow it exists
    END IF;
    
    -- Cancel any other pending requests between these users
    UPDATE public.duo_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE ((requester_id = NEW.requester_id AND requested_id = NEW.requested_id)
        OR (requester_id = NEW.requested_id AND requested_id = NEW.requester_id))
      AND status = 'pending'
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire old pending requests
CREATE OR REPLACE FUNCTION expire_old_duo_requests()
RETURNS void AS $$
BEGIN
  UPDATE public.duo_requests
  SET status = 'cancelled', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run expiration check (if pg_cron is available)
-- Note: This requires pg_cron extension. If not available, can be run manually or via app cron
-- SELECT cron.schedule('expire-duo-requests', '0 * * * *', 'SELECT expire_old_duo_requests()');

-- Set default expiration to 14 days from creation for new requests
-- Update existing pending requests to expire in 14 days if they don't have an expiration
UPDATE public.duo_requests
SET expires_at = created_at + INTERVAL '14 days'
WHERE status = 'pending' AND expires_at IS NULL;

-- Add comment explaining expiration
COMMENT ON COLUMN public.duo_requests.expires_at IS 'When the request expires. Pending requests expire after 14 days if not set.';
COMMENT ON COLUMN public.duo_requests.duo_name IS 'Proposed duo name from the requester';
COMMENT ON COLUMN public.duo_requests.duo_tagline IS 'Proposed duo tagline from the requester';
COMMENT ON COLUMN public.duo_requests.duo_bio IS 'Proposed duo bio from the requester';
COMMENT ON COLUMN public.duo_requests.duo_interests IS 'Proposed duo interests from the requester';
COMMENT ON COLUMN public.duo_requests.duo_photo_url IS 'Proposed duo photo URL from the requester';

