-- Migration: Duo Embedding Computation Triggers
-- Automatically computes duo embeddings when user embeddings are updated
-- Version: 2.0

-- ============================================================================
-- 1. Function to compute and update duo embedding
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_duo_embedding_for_user(user_uuid UUID)
RETURNS void AS $$
DECLARE
  duo_record RECORD;
  member1_embedding vector;
  member2_embedding vector;
  avg_embedding vector;
BEGIN
  -- Find all active duos where this user is a member
  FOR duo_record IN
    SELECT id, member1_id, member2_id
    FROM public.duos
    WHERE (member1_id = user_uuid OR member2_id = user_uuid)
    AND is_active = true
  LOOP
    -- Get embeddings for both members
    SELECT unified_preference_vector INTO member1_embedding
    FROM public.user_embedding
    WHERE user_id = duo_record.member1_id;
    
    SELECT unified_preference_vector INTO member2_embedding
    FROM public.user_embedding
    WHERE user_id = duo_record.member2_id;
    
    -- Compute average if both embeddings exist
    IF member1_embedding IS NOT NULL AND member2_embedding IS NOT NULL THEN
      avg_embedding := (member1_embedding + member2_embedding) / 2.0;
    ELSIF member1_embedding IS NOT NULL THEN
      avg_embedding := member1_embedding;
    ELSIF member2_embedding IS NOT NULL THEN
      avg_embedding := member2_embedding;
    ELSE
      avg_embedding := NULL;
    END IF;
    
    -- Insert or update duo embedding
    INSERT INTO public.duo_embedding (duo_id, unified_embedding, last_updated_at)
    VALUES (duo_record.id, avg_embedding, NOW())
    ON CONFLICT (duo_id) DO UPDATE
    SET unified_embedding = EXCLUDED.unified_embedding,
        last_updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Trigger function to compute duo embeddings when user embedding updates
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_compute_duo_embeddings()
RETURNS TRIGGER AS $$
BEGIN
  -- Compute duo embeddings for all duos containing this user
  PERFORM compute_duo_embedding_for_user(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Create trigger on user_embedding table
-- ============================================================================

DROP TRIGGER IF EXISTS compute_duo_embeddings_on_user_update ON public.user_embedding;

CREATE TRIGGER compute_duo_embeddings_on_user_update
  AFTER INSERT OR UPDATE OF unified_preference_vector ON public.user_embedding
  FOR EACH ROW
  WHEN (NEW.unified_preference_vector IS NOT NULL)
  EXECUTE FUNCTION trigger_compute_duo_embeddings();

-- ============================================================================
-- 4. Function to automatically compute user embedding after photos/prompts added
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_compute_user_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called from application code, not database trigger
  -- Database triggers for this would require calling external services (OpenAI)
  -- which is better handled in application layer
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION compute_duo_embedding_for_user IS 'Computes and updates duo embeddings for all duos containing the specified user';
COMMENT ON FUNCTION trigger_compute_duo_embeddings IS 'Trigger function to compute duo embeddings when user embeddings are updated';
COMMENT ON TRIGGER compute_duo_embeddings_on_user_update ON public.user_embedding IS 'Automatically computes duo embeddings when user embedding is created or updated';

