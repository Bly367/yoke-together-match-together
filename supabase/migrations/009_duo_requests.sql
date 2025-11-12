-- Migration: Duo Request System
-- Allows users to send duo requests that require acceptance before creating a duo

-- Create duo_requests table
CREATE TABLE IF NOT EXISTS public.duo_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT, -- Optional message from requester
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_users CHECK (requester_id != requested_id)
);

-- Create unique index for pending requests only (allows multiple non-pending requests)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
ON public.duo_requests(requester_id, requested_id) 
WHERE status = 'pending';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_duo_requests_requester ON public.duo_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_duo_requests_requested ON public.duo_requests(requested_id);
CREATE INDEX IF NOT EXISTS idx_duo_requests_status ON public.duo_requests(status);
CREATE INDEX IF NOT EXISTS idx_duo_requests_pending ON public.duo_requests(requested_id, status) 
  WHERE status = 'pending';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_duo_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_duo_requests_updated_at
  BEFORE UPDATE ON public.duo_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_duo_requests_updated_at();

-- Function to create duo when request is accepted
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
      -- Create the duo (member1 is requester, member2 is requested)
      INSERT INTO public.duos (member1_id, member2_id, is_active)
      VALUES (NEW.requester_id, NEW.requested_id, true)
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

-- Trigger to create duo when request is accepted
CREATE TRIGGER create_duo_on_accept
  AFTER UPDATE OF status ON public.duo_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted'))
  EXECUTE FUNCTION create_duo_on_request_accept();

-- Enable RLS
ALTER TABLE public.duo_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view requests they sent or received
CREATE POLICY "Users can view own requests" ON public.duo_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = requested_id);

-- Users can create requests they send
CREATE POLICY "Users can create requests" ON public.duo_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Users can update requests they received (to accept/reject)
CREATE POLICY "Users can update received requests" ON public.duo_requests
  FOR UPDATE USING (auth.uid() = requested_id);

-- Users can update requests they sent (to cancel)
CREATE POLICY "Users can cancel sent requests" ON public.duo_requests
  FOR UPDATE USING (auth.uid() = requester_id AND status = 'pending');

-- Users can delete their own requests
CREATE POLICY "Users can delete own requests" ON public.duo_requests
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = requested_id);

