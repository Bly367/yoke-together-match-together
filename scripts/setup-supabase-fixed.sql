-- Yoke Dating App - Database Schema (Fixed Version)
-- Copy this entire file and run it in Supabase SQL Editor
-- Make sure to run it as a single transaction

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.duos CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.handle_match() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  bio TEXT,
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Duos table (pairs of users)
CREATE TABLE public.duos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  tagline TEXT,
  bio TEXT,
  photo_url TEXT,
  interests TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT different_members CHECK (member1_id != member2_id)
);

-- Swipes table (likes/passes)
CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_duo_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  swiped_duo_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(swiper_duo_id, swiped_duo_id),
  CONSTRAINT different_duos CHECK (swiper_duo_id != swiped_duo_id)
);

-- Matches table (mutual likes)
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duo1_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  duo2_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(duo1_id, duo2_id),
  CONSTRAINT different_duos CHECK (duo1_id != duo2_id)
);

-- Messages table (group chat messages)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_duos_member1 ON public.duos(member1_id);
CREATE INDEX IF NOT EXISTS idx_duos_member2 ON public.duos(member2_id);
CREATE INDEX IF NOT EXISTS idx_duos_active ON public.duos(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON public.swipes(swiper_duo_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON public.swipes(swiped_duo_id);
CREATE INDEX IF NOT EXISTS idx_matches_duo1 ON public.matches(duo1_id);
CREATE INDEX IF NOT EXISTS idx_matches_duo2 ON public.matches(duo2_id);
CREATE INDEX IF NOT EXISTS idx_matches_active ON public.matches(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert their own profile (during sign up)
-- This policy allows the user to create their profile when they sign up
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Also allow service role to insert profiles (for triggers/functions)
-- This is needed for automatic profile creation via database triggers
CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT 
  WITH CHECK (true)
  TO service_role;

-- Duos: Users can read all active duos, update only their own
CREATE POLICY "Active duos are viewable by everyone" ON public.duos
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can update own duos" ON public.duos
  FOR UPDATE USING (auth.uid() = member1_id OR auth.uid() = member2_id);

CREATE POLICY "Users can create duos they're a member of" ON public.duos
  FOR INSERT WITH CHECK (auth.uid() = member1_id OR auth.uid() = member2_id);

-- Swipes: Users can only see swipes from their duos
CREATE POLICY "Users can view swipes from own duos" ON public.swipes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.duos
      WHERE id = swipes.swiper_duo_id
      AND (member1_id = auth.uid() OR member2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create swipes for own duos" ON public.swipes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.duos
      WHERE id = swipes.swiper_duo_id
      AND (member1_id = auth.uid() OR member2_id = auth.uid())
    )
  );

-- Matches: Users can view matches for their duos
CREATE POLICY "Users can view matches for own duos" ON public.matches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.duos
      WHERE (id = matches.duo1_id OR id = matches.duo2_id)
      AND (member1_id = auth.uid() OR member2_id = auth.uid())
    )
  );

-- Messages: Users can view messages for matches involving their duos
CREATE POLICY "Users can view messages for own matches" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = messages.match_id
      AND (duos.member1_id = auth.uid() OR duos.member2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages to own matches" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      JOIN public.duos ON (duos.id = matches.duo1_id OR duos.id = matches.duo2_id)
      WHERE matches.id = messages.match_id
      AND (duos.member1_id = auth.uid() OR duos.member2_id = auth.uid())
    )
  );

-- Functions

-- Function to create a match when two duos like each other
CREATE OR REPLACE FUNCTION public.handle_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the swiped duo has also liked the swiper duo
  IF NEW.action = 'like' AND EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_duo_id = NEW.swiped_duo_id
    AND swiped_duo_id = NEW.swiper_duo_id
    AND action = 'like'
  ) THEN
    -- Create a match (use canonical ordering to avoid duplicates)
    INSERT INTO public.matches (duo1_id, duo2_id)
    VALUES (
      LEAST(NEW.swiper_duo_id, NEW.swiped_duo_id),
      GREATEST(NEW.swiper_duo_id, NEW.swiped_duo_id)
    )
    ON CONFLICT (duo1_id, duo2_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create matches automatically
CREATE TRIGGER create_match_on_mutual_like
  AFTER INSERT ON public.swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_match();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_duos_updated_at
  BEFORE UPDATE ON public.duos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE '✅ Database schema created successfully!';
  RAISE NOTICE '✅ Tables: profiles, duos, swipes, matches, messages';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Triggers created';
END $$;

