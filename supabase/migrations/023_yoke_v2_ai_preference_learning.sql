-- Migration: Yoke V2 - AI Preference Learning & Hinge-Style Profiles
-- Adds comprehensive AI preference learning system with vector embeddings
-- Version: 2.0

-- ============================================================================
-- 1. Enable pgvector extension for vector embeddings
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. Create user_photos table (multiple photos per user with visual embeddings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  visual_embedding vector(1536), -- OpenAI vision embedding dimension
  embedding_generated_at TIMESTAMP WITH TIME ZONE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_display_order CHECK (display_order >= 0)
);

-- ============================================================================
-- 3. Create user_prompts table (prompt answers with text embeddings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL, -- The prompt question (e.g., "Two truths and a lie")
  answer_text TEXT NOT NULL, -- User's answer
  display_order INTEGER NOT NULL DEFAULT 0,
  text_embedding vector(1536), -- OpenAI text embedding dimension
  embedding_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_display_order CHECK (display_order >= 0)
);

-- ============================================================================
-- 4. Create preference_events table (behavioral signals tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.preference_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'like', 'hard_like', 'pass', 'view', 'photo_expand', 
    'prompt_scroll', 'message_sent', 'match_success', 'ghost_after_match'
  )),
  target_duo_id UUID REFERENCES public.duos(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_photo_id UUID REFERENCES public.user_photos(id) ON DELETE SET NULL,
  target_prompt_id UUID REFERENCES public.user_prompts(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::JSONB, -- Additional context (dwell_time_ms, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_event_target CHECK (
    (target_duo_id IS NOT NULL) OR 
    (target_user_id IS NOT NULL) OR 
    (target_photo_id IS NOT NULL) OR 
    (target_prompt_id IS NOT NULL)
  )
);

-- ============================================================================
-- 5. Create user_embedding table (computed preference vectors)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_embedding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  visual_preference_vector vector(1536),
  prompt_semantic_vector vector(1536),
  behavioral_preference_vector vector(1536),
  unified_preference_vector vector(1536), -- Combined: 0.45*visual + 0.35*prompt + 0.20*behavioral
  elo_score DOUBLE PRECISION DEFAULT 1500.0,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_elo_score CHECK (elo_score >= 0)
);

-- ============================================================================
-- 6. Create duo_embedding table (duo combined preference vectors)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.duo_embedding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  duo_id UUID NOT NULL UNIQUE REFERENCES public.duos(id) ON DELETE CASCADE,
  unified_embedding vector(1536), -- Average of both members' unified_preference_vector
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 7. Create discover_feed_rank_cache table (optional optimization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discover_feed_rank_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duo_id UUID NOT NULL REFERENCES public.duos(id) ON DELETE CASCADE,
  rank_score DOUBLE PRECISION NOT NULL,
  visual_similarity DOUBLE PRECISION,
  prompt_similarity DOUBLE PRECISION,
  duo_compatibility DOUBLE PRECISION,
  behavioral_alignment DOUBLE PRECISION,
  elo_component DOUBLE PRECISION,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, duo_id)
);

-- ============================================================================
-- 8. Create indexes for performance
-- ============================================================================

-- User photos indexes
CREATE INDEX IF NOT EXISTS idx_user_photos_user ON public.user_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_order ON public.user_photos(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_user_photos_primary ON public.user_photos(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_user_photos_embedding ON public.user_photos USING ivfflat (visual_embedding vector_cosine_ops) WITH (lists = 100);

-- User prompts indexes
CREATE INDEX IF NOT EXISTS idx_user_prompts_user ON public.user_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompts_order ON public.user_prompts(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_user_prompts_embedding ON public.user_prompts USING ivfflat (text_embedding vector_cosine_ops) WITH (lists = 100);

-- Preference events indexes
CREATE INDEX IF NOT EXISTS idx_preference_events_user ON public.preference_events(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_events_type ON public.preference_events(event_type);
CREATE INDEX IF NOT EXISTS idx_preference_events_created ON public.preference_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preference_events_duo ON public.preference_events(target_duo_id) WHERE target_duo_id IS NOT NULL;

-- User embedding indexes
CREATE INDEX IF NOT EXISTS idx_user_embedding_user ON public.user_embedding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_embedding_unified ON public.user_embedding USING ivfflat (unified_preference_vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_user_embedding_elo ON public.user_embedding(elo_score DESC);

-- Duo embedding indexes
CREATE INDEX IF NOT EXISTS idx_duo_embedding_duo ON public.duo_embedding(duo_id);
CREATE INDEX IF NOT EXISTS idx_duo_embedding_unified ON public.duo_embedding USING ivfflat (unified_embedding vector_cosine_ops) WITH (lists = 100);

-- Discover feed cache indexes
CREATE INDEX IF NOT EXISTS idx_discover_cache_user ON public.discover_feed_rank_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_discover_cache_score ON public.discover_feed_rank_cache(user_id, rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_discover_cache_duo ON public.discover_feed_rank_cache(duo_id);
CREATE INDEX IF NOT EXISTS idx_discover_cache_created ON public.discover_feed_rank_cache(cached_at DESC);

-- ============================================================================
-- 9. Create triggers for updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_photos_updated_at
  BEFORE UPDATE ON public.user_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_user_photos_updated_at();

CREATE OR REPLACE FUNCTION update_user_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_prompts_updated_at
  BEFORE UPDATE ON public.user_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_prompts_updated_at();

CREATE OR REPLACE FUNCTION update_user_embedding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_embedding_updated_at
  BEFORE UPDATE ON public.user_embedding
  FOR EACH ROW
  EXECUTE FUNCTION update_user_embedding_updated_at();

CREATE OR REPLACE FUNCTION update_duo_embedding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_duo_embedding_updated_at
  BEFORE UPDATE ON public.duo_embedding
  FOR EACH ROW
  EXECUTE FUNCTION update_duo_embedding_updated_at();

-- ============================================================================
-- 10. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preference_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_embedding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duo_embedding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discover_feed_rank_cache ENABLE ROW LEVEL SECURITY;

-- User photos: Users can view all photos, manage their own
CREATE POLICY "Users can view all photos"
  ON public.user_photos FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own photos"
  ON public.user_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
  ON public.user_photos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.user_photos FOR DELETE
  USING (auth.uid() = user_id);

-- User prompts: Users can view all prompts, manage their own
CREATE POLICY "Users can view all prompts"
  ON public.user_prompts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own prompts"
  ON public.user_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
  ON public.user_prompts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
  ON public.user_prompts FOR DELETE
  USING (auth.uid() = user_id);

-- Preference events: Users can only insert their own events, view their own
CREATE POLICY "Users can view their own preference events"
  ON public.preference_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preference events"
  ON public.preference_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User embedding: Users can view all embeddings (for matching), update their own
CREATE POLICY "Users can view all embeddings"
  ON public.user_embedding FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own embedding"
  ON public.user_embedding FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embedding"
  ON public.user_embedding FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Duo embedding: Users can view all duo embeddings (for matching)
CREATE POLICY "Users can view all duo embeddings"
  ON public.duo_embedding FOR SELECT
  USING (true);

-- Discover feed cache: Users can view their own cache
CREATE POLICY "Users can view their own discover cache"
  ON public.discover_feed_rank_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own discover cache"
  ON public.discover_feed_rank_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own discover cache"
  ON public.discover_feed_rank_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own discover cache"
  ON public.discover_feed_rank_cache FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 11. Helper Functions for Embedding Operations
-- ============================================================================

-- Function to compute cosine similarity between two vectors
CREATE OR REPLACE FUNCTION vector_cosine_similarity(vec1 vector, vec2 vector)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN 1 - (vec1 <=> vec2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to compute unified preference vector
-- Formula: 0.45 * visual + 0.35 * prompt + 0.20 * behavioral
CREATE OR REPLACE FUNCTION compute_unified_preference_vector(
  visual_vec vector,
  prompt_vec vector,
  behavioral_vec vector
)
RETURNS vector AS $$
DECLARE
  result vector;
BEGIN
  -- Weighted combination
  result := (
    0.45 * COALESCE(visual_vec, (SELECT visual_preference_vector FROM public.user_embedding WHERE user_id = auth.uid() LIMIT 1)) +
    0.35 * COALESCE(prompt_vec, (SELECT prompt_semantic_vector FROM public.user_embedding WHERE user_id = auth.uid() LIMIT 1)) +
    0.20 * COALESCE(behavioral_vec, (SELECT behavioral_preference_vector FROM public.user_embedding WHERE user_id = auth.uid() LIMIT 1))
  );
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to compute duo embedding (average of both members)
CREATE OR REPLACE FUNCTION compute_duo_embedding(duo_uuid UUID)
RETURNS vector AS $$
DECLARE
  member1_id UUID;
  member2_id UUID;
  member1_vec vector;
  member2_vec vector;
  avg_vec vector;
BEGIN
  -- Get duo members
  SELECT member1_id, member2_id INTO member1_id, member2_id
  FROM public.duos
  WHERE id = duo_uuid;
  
  -- Get member embeddings
  SELECT unified_preference_vector INTO member1_vec
  FROM public.user_embedding
  WHERE user_id = member1_id;
  
  SELECT unified_preference_vector INTO member2_vec
  FROM public.user_embedding
  WHERE user_id = member2_id;
  
  -- Compute average
  IF member1_vec IS NOT NULL AND member2_vec IS NOT NULL THEN
    avg_vec := (member1_vec + member2_vec) / 2.0;
  ELSIF member1_vec IS NOT NULL THEN
    avg_vec := member1_vec;
  ELSIF member2_vec IS NOT NULL THEN
    avg_vec := member2_vec;
  ELSE
    avg_vec := NULL;
  END IF;
  
  RETURN avg_vec;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.user_photos IS 'User photos with visual embeddings for AI preference learning';
COMMENT ON TABLE public.user_prompts IS 'User prompt answers with text embeddings for personality matching';
COMMENT ON TABLE public.preference_events IS 'Behavioral signals tracking for preference learning';
COMMENT ON TABLE public.user_embedding IS 'Computed preference vectors for each user';
COMMENT ON TABLE public.duo_embedding IS 'Combined preference vectors for duos';
COMMENT ON TABLE public.discover_feed_rank_cache IS 'Cached ranking scores for discover feed optimization';

COMMENT ON COLUMN public.user_photos.visual_embedding IS 'OpenAI vision embedding (1536 dimensions)';
COMMENT ON COLUMN public.user_prompts.text_embedding IS 'OpenAI text embedding (1536 dimensions)';
COMMENT ON COLUMN public.user_embedding.unified_preference_vector IS 'Combined vector: 0.45*visual + 0.35*prompt + 0.20*behavioral';
COMMENT ON COLUMN public.user_embedding.elo_score IS 'ELO rating for attractiveness balancing';
COMMENT ON COLUMN public.preference_events.metadata IS 'JSONB with additional context (dwell_time_ms, etc.)';

