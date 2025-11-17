-- Migration: Group Games Foundation
-- Date: 2024-12-19
-- Description: Creates database schema for group games feature
--              Enables matched duos (4 people) to play interactive games together
--              Includes game definitions, sessions, players, actions, and results

-- 1. Create games table (game definitions)
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  rules TEXT NOT NULL,
  min_players INTEGER DEFAULT 2 CHECK (min_players >= 2 AND min_players <= 4),
  max_players INTEGER DEFAULT 4 CHECK (max_players >= 2 AND max_players <= 4),
  estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),
  category TEXT CHECK (category IN ('ice-breaker', 'trivia', 'comparison', 'quiz', 'other')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_player_range CHECK (min_players <= max_players)
);

-- 2. Create game_sessions table (active game instances)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  current_turn_user_id UUID REFERENCES public.profiles(id),
  game_state JSONB DEFAULT '{}'::JSONB, -- Flexible game-specific state
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create game_session_players table (players in sessions)
CREATE TABLE IF NOT EXISTS public.game_session_players (
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (session_id, user_id)
);

-- 4. Create game_actions table (player actions in games)
CREATE TABLE IF NOT EXISTS public.game_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'submit_answer', 'vote', 'guess', 'start_round', etc.
  action_data JSONB NOT NULL DEFAULT '{}'::JSONB, -- Flexible action-specific data
  round_number INTEGER DEFAULT 1 CHECK (round_number > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create game_results table (completed game results)
CREATE TABLE IF NOT EXISTS public.game_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  final_score INTEGER DEFAULT 0,
  rank INTEGER CHECK (rank > 0), -- 1st, 2nd, 3rd, 4th place
  achievements TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of achievement strings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_match ON public.game_sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON public.game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_by ON public.game_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON public.game_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_session_players_session ON public.game_session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_game_session_players_user ON public.game_session_players(user_id);
CREATE INDEX IF NOT EXISTS idx_game_session_players_active ON public.game_session_players(session_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_game_actions_session ON public.game_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_user ON public.game_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_round ON public.game_actions(session_id, round_number);
CREATE INDEX IF NOT EXISTS idx_game_actions_created ON public.game_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_results_session ON public.game_results(session_id);
CREATE INDEX IF NOT EXISTS idx_game_results_user ON public.game_results(user_id);
CREATE INDEX IF NOT EXISTS idx_game_results_rank ON public.game_results(session_id, rank);

-- 7. Create function to update game_sessions.updated_at
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

CREATE TRIGGER trigger_update_game_sessions_updated_at
  BEFORE UPDATE ON public.game_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_game_sessions_updated_at();

-- 8. Create function to update game_sessions.last_message_at when actions are created
-- This helps track activity in game sessions
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

CREATE TRIGGER trigger_update_game_session_on_action
  AFTER INSERT ON public.game_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_game_session_on_action();

-- 9. Enable RLS on all tables
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for games table
-- All users can view active games
CREATE POLICY "Users can view active games" 
ON public.games
FOR SELECT
USING (is_active = true);

-- 11. RLS Policies for game_sessions table
-- Users can only view sessions for matches they're in
CREATE POLICY "Users can view sessions for their matches" 
ON public.game_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = game_sessions.match_id
    AND (
      EXISTS (
        SELECT 1 FROM public.duos
        WHERE duos.id = matches.duo1_id
        AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
      )
      OR EXISTS (
        SELECT 1 FROM public.duos
        WHERE duos.id = matches.duo2_id
        AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
      )
    )
  )
);

-- Users can create sessions for matches they're in
CREATE POLICY "Users can create sessions for their matches" 
ON public.game_sessions
FOR INSERT
WITH CHECK (
  created_by = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.matches
    WHERE matches.id = game_sessions.match_id
    AND (
      EXISTS (
        SELECT 1 FROM public.duos
        WHERE duos.id = matches.duo1_id
        AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
      )
      OR EXISTS (
        SELECT 1 FROM public.duos
        WHERE duos.id = matches.duo2_id
        AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
      )
    )
  )
);

-- Users can update sessions they created or are players in
CREATE POLICY "Users can update sessions they're in" 
ON public.game_sessions
FOR UPDATE
USING (
  created_by = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.game_session_players
    WHERE game_session_players.session_id = game_sessions.id
    AND game_session_players.user_id = (select auth.uid())
    AND game_session_players.is_active = true
  )
);

-- 12. RLS Policies for game_session_players table
-- Users can view players for sessions they're in
CREATE POLICY "Users can view players for their sessions" 
ON public.game_session_players
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.game_sessions
    WHERE game_sessions.id = game_session_players.session_id
    AND (
      game_sessions.created_by = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.matches
        WHERE matches.id = game_sessions.match_id
        AND (
          EXISTS (
            SELECT 1 FROM public.duos
            WHERE duos.id = matches.duo1_id
            AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
          )
          OR EXISTS (
            SELECT 1 FROM public.duos
            WHERE duos.id = matches.duo2_id
            AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
          )
        )
      )
    )
  )
);

-- Users can join sessions for matches they're in
CREATE POLICY "Users can join sessions for their matches" 
ON public.game_session_players
FOR INSERT
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.game_sessions
    WHERE game_sessions.id = game_session_players.session_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = game_sessions.match_id
      AND (
        EXISTS (
          SELECT 1 FROM public.duos
          WHERE duos.id = matches.duo1_id
          AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
        )
        OR EXISTS (
          SELECT 1 FROM public.duos
          WHERE duos.id = matches.duo2_id
          AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
        )
      )
    )
  )
);

-- Users can update their own player record
CREATE POLICY "Users can update their own player record" 
ON public.game_session_players
FOR UPDATE
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- 13. RLS Policies for game_actions table
-- Users can view actions for sessions they're in
CREATE POLICY "Users can view actions for their sessions" 
ON public.game_actions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.game_sessions
    WHERE game_sessions.id = game_actions.session_id
    AND (
      game_sessions.created_by = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.matches
        WHERE matches.id = game_sessions.match_id
        AND (
          EXISTS (
            SELECT 1 FROM public.duos
            WHERE duos.id = matches.duo1_id
            AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
          )
          OR EXISTS (
            SELECT 1 FROM public.duos
            WHERE duos.id = matches.duo2_id
            AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
          )
        )
      )
    )
  )
);

-- Users can create actions for sessions they're active players in
CREATE POLICY "Users can create actions for their sessions" 
ON public.game_actions
FOR INSERT
WITH CHECK (
  user_id = (select auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.game_session_players
    WHERE game_session_players.session_id = game_actions.session_id
    AND game_session_players.user_id = (select auth.uid())
    AND game_session_players.is_active = true
  )
);

-- 14. RLS Policies for game_results table
-- Users can view results for sessions they were players in
CREATE POLICY "Users can view results for their sessions" 
ON public.game_results
FOR SELECT
USING (
  user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.game_sessions
    WHERE game_sessions.id = game_results.session_id
    AND EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = game_sessions.match_id
      AND (
        EXISTS (
          SELECT 1 FROM public.duos
          WHERE duos.id = matches.duo1_id
          AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
        )
        OR EXISTS (
          SELECT 1 FROM public.duos
          WHERE duos.id = matches.duo2_id
          AND (duos.member1_id = (select auth.uid()) OR duos.member2_id = (select auth.uid()))
        )
      )
    )
  )
);

-- 15. Seed initial games
INSERT INTO public.games (name, description, rules, min_players, max_players, estimated_duration_minutes, category, is_active) VALUES
  (
    'two-truths-and-a-lie',
    'Two Truths and a Lie',
    'Each player submits 3 statements: 2 true, 1 false. Other players guess which is the lie. Points for correct guesses.',
    4,
    4,
    15,
    'ice-breaker',
    true
  ),
  (
    'would-you-rather',
    'Would You Rather',
    'System generates "Would You Rather" questions. Each player votes on their choice. Results shown to all players.',
    4,
    4,
    10,
    'comparison',
    true
  ),
  (
    'this-or-that',
    'This or That',
    'Quick-fire comparison questions. Each player chooses between two options. Results aggregated and shown.',
    4,
    4,
    5,
    'comparison',
    true
  ),
  (
    'compatibility-quiz',
    'Compatibility Quiz',
    'Questions about preferences, values, interests. Each player answers independently. Results show compatibility percentages.',
    4,
    4,
    20,
    'quiz',
    true
  ),
  (
    'trivia-challenge',
    'Trivia Challenge',
    'Multiple choice trivia questions. All players answer simultaneously. Points for correct answers. Leaderboard at end.',
    4,
    4,
    15,
    'trivia',
    true
  )
ON CONFLICT (name) DO NOTHING;

-- 16. Add table comments
COMMENT ON TABLE public.games IS 'Game definitions for group games that matched duos can play together';
COMMENT ON TABLE public.game_sessions IS 'Active game instances scoped to matches. Tracks game state and status.';
COMMENT ON TABLE public.game_session_players IS 'Players participating in game sessions. Tracks scores and active status.';
COMMENT ON TABLE public.game_actions IS 'Player actions within games. Flexible JSONB structure for game-specific actions.';
COMMENT ON TABLE public.game_results IS 'Final results for completed game sessions. Includes scores, ranks, and achievements.';

COMMENT ON COLUMN public.game_sessions.game_state IS 'JSONB field storing flexible game-specific state (round number, turn order, submitted answers, etc.)';
COMMENT ON COLUMN public.game_actions.action_data IS 'JSONB field storing action-specific data (answer text, vote choice, guess, etc.)';

-- 17. Verify RLS is enabled and policies exist
DO $$
DECLARE
  games_policies INTEGER;
  sessions_policies INTEGER;
  players_policies INTEGER;
  actions_policies INTEGER;
  results_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO games_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'games';

  SELECT COUNT(*) INTO sessions_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'game_sessions';

  SELECT COUNT(*) INTO players_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'game_session_players';

  SELECT COUNT(*) INTO actions_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'game_actions';

  SELECT COUNT(*) INTO results_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'game_results';

  IF games_policies < 1 THEN
    RAISE EXCEPTION 'Failed to create policies for games table';
  END IF;

  IF sessions_policies < 3 THEN
    RAISE EXCEPTION 'Failed to create policies for game_sessions table';
  END IF;

  IF players_policies < 3 THEN
    RAISE EXCEPTION 'Failed to create policies for game_session_players table';
  END IF;

  IF actions_policies < 2 THEN
    RAISE EXCEPTION 'Failed to create policies for game_actions table';
  END IF;

  IF results_policies < 1 THEN
    RAISE EXCEPTION 'Failed to create policies for game_results table';
  END IF;

  RAISE NOTICE 'Successfully created % policies for games, % policies for game_sessions, % policies for game_session_players, % policies for game_actions, % policies for game_results',
    games_policies, sessions_policies, players_policies, actions_policies, results_policies;
END $$;

