-- Migration: Advanced Filtering & Preferences
-- Adds comprehensive preference system similar to top-tier dating apps
-- Extends profiles with demographic fields and creates user_preferences and user_interests tables

-- ============================================================================
-- 1. Extend profiles table with demographic fields
-- ============================================================================

ALTER TABLE public.profiles
  -- Height in inches (3-8 feet)
  ADD COLUMN IF NOT EXISTS height_inches INTEGER CHECK (height_inches BETWEEN 36 AND 96),
  
  -- Education level
  ADD COLUMN IF NOT EXISTS education_level TEXT CHECK (education_level IN (
    'high-school', 'some-college', 'associates', 'bachelors', 
    'masters', 'phd', 'prefer-not-to-say'
  )),
  
  -- Religion
  ADD COLUMN IF NOT EXISTS religion TEXT CHECK (religion IN (
    'christianity', 'islam', 'judaism', 'hinduism', 'buddhism', 
    'sikhism', 'atheist', 'agnostic', 'spiritual', 'other', 'prefer-not-to-say'
  )),
  
  -- Political views
  ADD COLUMN IF NOT EXISTS political_views TEXT CHECK (political_views IN (
    'very-liberal', 'liberal', 'moderate', 'conservative', 
    'very-conservative', 'libertarian', 'other', 'prefer-not-to-say'
  )),
  
  -- Lifestyle habits
  ADD COLUMN IF NOT EXISTS drinking_habit TEXT CHECK (drinking_habit IN (
    'never', 'rarely', 'socially', 'often', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS smoking_habit TEXT CHECK (smoking_habit IN (
    'never', 'socially', 'regularly', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS exercise_frequency TEXT CHECK (exercise_frequency IN (
    'never', 'rarely', '1-2-times-week', '3-5-times-week', 
    'daily', 'prefer-not-to-say'
  )),
  
  -- Relationship goals
  ADD COLUMN IF NOT EXISTS relationship_goal TEXT CHECK (relationship_goal IN (
    'casual-dating', 'serious-relationship', 'marriage', 
    'friendship', 'not-sure', 'prefer-not-to-say'
  )),
  
  -- Kids
  ADD COLUMN IF NOT EXISTS has_kids TEXT CHECK (has_kids IN (
    'yes', 'no', 'prefer-not-to-say'
  )),
  ADD COLUMN IF NOT EXISTS wants_kids TEXT CHECK (wants_kids IN (
    'yes', 'no', 'maybe', 'prefer-not-to-say'
  )),
  
  -- Languages (array of language codes, e.g., ['en', 'es', 'fr'])
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Ethnicity
  ADD COLUMN IF NOT EXISTS ethnicity TEXT CHECK (ethnicity IN (
    'asian', 'black', 'hispanic', 'middle-eastern', 'native-american', 
    'pacific-islander', 'white', 'mixed', 'other', 'prefer-not-to-say'
  )),
  
  -- Additional fields
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS pets TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ============================================================================
-- 2. Create user_preferences table (matching preferences)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Age preferences
  min_age INTEGER CHECK (min_age >= 18 AND min_age <= 100),
  max_age INTEGER CHECK (max_age >= 18 AND max_age <= 100),
  
  -- Distance preferences (in miles)
  max_distance_miles INTEGER DEFAULT 50 CHECK (max_distance_miles > 0),
  
  -- Height preferences (in inches)
  min_height_inches INTEGER CHECK (min_height_inches BETWEEN 36 AND 96),
  max_height_inches INTEGER CHECK (max_height_inches BETWEEN 36 AND 96),
  
  -- Education preferences (array of acceptable values)
  education_levels TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Religion preferences
  religions TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Political preferences
  political_views TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Lifestyle preferences
  drinking_habits TEXT[] DEFAULT ARRAY[]::TEXT[],
  smoking_habits TEXT[] DEFAULT ARRAY[]::TEXT[],
  exercise_frequencies TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Relationship preferences
  relationship_goals TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Kids preferences
  has_kids_preference TEXT CHECK (has_kids_preference IN ('yes', 'no', 'either', 'prefer-not-to-say')),
  wants_kids_preference TEXT CHECK (wants_kids_preference IN ('yes', 'no', 'maybe', 'either', 'prefer-not-to-say')),
  
  -- Language preferences
  languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Ethnicity preferences
  ethnicities TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Dealbreakers (JSONB for flexibility)
  -- Example: {"age": true, "distance": true, "smoking": true, "has_kids": true}
  dealbreakers JSONB DEFAULT '{}'::JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_age_range CHECK (min_age IS NULL OR max_age IS NULL OR min_age <= max_age),
  CONSTRAINT valid_height_range CHECK (min_height_inches IS NULL OR max_height_inches IS NULL OR min_height_inches <= max_height_inches)
);

-- ============================================================================
-- 3. Create user_interests table (for interest-based matching)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest TEXT NOT NULL, -- e.g., 'hiking', 'cooking', 'travel', 'music', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, interest)
);

-- ============================================================================
-- 4. Create interest categories table (for organization)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interest_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- e.g., 'sports', 'music', 'food', 'travel'
  display_name TEXT NOT NULL,
  icon TEXT, -- Icon identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 5. Create predefined interests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.predefined_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.interest_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 6. Create indexes for performance
-- ============================================================================

-- Indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_age ON public.user_preferences(min_age, max_age);
CREATE INDEX IF NOT EXISTS idx_user_preferences_distance ON public.user_preferences(max_distance_miles);

-- Indexes for user_interests
CREATE INDEX IF NOT EXISTS idx_user_interests_user ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON public.user_interests(interest);

-- Indexes for profile filtering
CREATE INDEX IF NOT EXISTS idx_profiles_age ON public.profiles(age) WHERE age IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_height ON public.profiles(height_inches) WHERE height_inches IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_education ON public.profiles(education_level) WHERE education_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_religion ON public.profiles(religion) WHERE religion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_relationship_goal ON public.profiles(relationship_goal) WHERE relationship_goal IS NOT NULL;

-- ============================================================================
-- 7. Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================================================
-- 8. Insert default interest categories and predefined interests
-- ============================================================================

-- Insert interest categories
INSERT INTO public.interest_categories (name, display_name, icon) VALUES
  ('sports', 'Sports & Fitness', 'dumbbell'),
  ('music', 'Music', 'music'),
  ('food', 'Food & Dining', 'utensils'),
  ('travel', 'Travel', 'plane'),
  ('arts', 'Arts & Culture', 'palette'),
  ('outdoors', 'Outdoors', 'mountain'),
  ('entertainment', 'Entertainment', 'film'),
  ('technology', 'Technology', 'laptop'),
  ('reading', 'Reading & Writing', 'book'),
  ('gaming', 'Gaming', 'gamepad-2')
ON CONFLICT (name) DO NOTHING;

-- Insert predefined interests (sample set) - grouped by category
DO $$
DECLARE
  sports_id UUID;
  music_id UUID;
  food_id UUID;
  travel_id UUID;
  arts_id UUID;
  outdoors_id UUID;
  entertainment_id UUID;
  technology_id UUID;
  reading_id UUID;
  gaming_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO sports_id FROM public.interest_categories WHERE name = 'sports';
  SELECT id INTO music_id FROM public.interest_categories WHERE name = 'music';
  SELECT id INTO food_id FROM public.interest_categories WHERE name = 'food';
  SELECT id INTO travel_id FROM public.interest_categories WHERE name = 'travel';
  SELECT id INTO arts_id FROM public.interest_categories WHERE name = 'arts';
  SELECT id INTO outdoors_id FROM public.interest_categories WHERE name = 'outdoors';
  SELECT id INTO entertainment_id FROM public.interest_categories WHERE name = 'entertainment';
  SELECT id INTO technology_id FROM public.interest_categories WHERE name = 'technology';
  SELECT id INTO reading_id FROM public.interest_categories WHERE name = 'reading';
  SELECT id INTO gaming_id FROM public.interest_categories WHERE name = 'gaming';

  -- Sports & Fitness
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (sports_id, 'running', 'Running'),
    (sports_id, 'yoga', 'Yoga'),
    (sports_id, 'weightlifting', 'Weightlifting'),
    (sports_id, 'cycling', 'Cycling'),
    (sports_id, 'swimming', 'Swimming'),
    (sports_id, 'basketball', 'Basketball'),
    (sports_id, 'soccer', 'Soccer'),
    (sports_id, 'tennis', 'Tennis')
  ON CONFLICT (name) DO NOTHING;

  -- Music
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (music_id, 'rock', 'Rock'),
    (music_id, 'pop', 'Pop'),
    (music_id, 'jazz', 'Jazz'),
    (music_id, 'classical', 'Classical'),
    (music_id, 'hip-hop', 'Hip-Hop'),
    (music_id, 'electronic', 'Electronic'),
    (music_id, 'country', 'Country'),
    (music_id, 'indie', 'Indie')
  ON CONFLICT (name) DO NOTHING;

  -- Food & Dining
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (food_id, 'cooking', 'Cooking'),
    (food_id, 'baking', 'Baking'),
    (food_id, 'wine', 'Wine'),
    (food_id, 'craft-beer', 'Craft Beer'),
    (food_id, 'coffee', 'Coffee'),
    (food_id, 'fine-dining', 'Fine Dining'),
    (food_id, 'vegan', 'Vegan'),
    (food_id, 'vegetarian', 'Vegetarian')
  ON CONFLICT (name) DO NOTHING;

  -- Travel
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (travel_id, 'backpacking', 'Backpacking'),
    (travel_id, 'beach-vacations', 'Beach Vacations'),
    (travel_id, 'city-breaks', 'City Breaks'),
    (travel_id, 'road-trips', 'Road Trips'),
    (travel_id, 'international-travel', 'International Travel'),
    (travel_id, 'camping', 'Camping')
  ON CONFLICT (name) DO NOTHING;

  -- Arts & Culture
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (arts_id, 'photography', 'Photography'),
    (arts_id, 'painting', 'Painting'),
    (arts_id, 'theater', 'Theater'),
    (arts_id, 'museums', 'Museums'),
    (arts_id, 'concerts', 'Concerts'),
    (arts_id, 'dancing', 'Dancing')
  ON CONFLICT (name) DO NOTHING;

  -- Outdoors
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (outdoors_id, 'hiking', 'Hiking'),
    (outdoors_id, 'camping', 'Camping'),
    (outdoors_id, 'fishing', 'Fishing'),
    (outdoors_id, 'surfing', 'Surfing'),
    (outdoors_id, 'skiing', 'Skiing'),
    (outdoors_id, 'rock-climbing', 'Rock Climbing')
  ON CONFLICT (name) DO NOTHING;

  -- Entertainment
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (entertainment_id, 'movies', 'Movies'),
    (entertainment_id, 'tv-shows', 'TV Shows'),
    (entertainment_id, 'comedy', 'Comedy'),
    (entertainment_id, 'stand-up', 'Stand-Up'),
    (entertainment_id, 'podcasts', 'Podcasts')
  ON CONFLICT (name) DO NOTHING;

  -- Technology
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (technology_id, 'programming', 'Programming'),
    (technology_id, 'gadgets', 'Gadgets'),
    (technology_id, 'ai', 'AI'),
    (technology_id, 'crypto', 'Crypto'),
    (technology_id, 'startups', 'Startups')
  ON CONFLICT (name) DO NOTHING;

  -- Reading & Writing
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (reading_id, 'reading', 'Reading'),
    (reading_id, 'writing', 'Writing'),
    (reading_id, 'poetry', 'Poetry'),
    (reading_id, 'journalism', 'Journalism'),
    (reading_id, 'blogging', 'Blogging')
  ON CONFLICT (name) DO NOTHING;

  -- Gaming
  INSERT INTO public.predefined_interests (category_id, name, display_name) VALUES
    (gaming_id, 'video-games', 'Video Games'),
    (gaming_id, 'board-games', 'Board Games'),
    (gaming_id, 'card-games', 'Card Games'),
    (gaming_id, 'esports', 'Esports')
  ON CONFLICT (name) DO NOTHING;
END $$;

-- ============================================================================
-- 9. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predefined_interests ENABLE ROW LEVEL SECURITY;

-- User preferences: Users can view/update their own preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- User interests: Users can manage their own interests
CREATE POLICY "Users can view their own interests"
  ON public.user_interests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interests"
  ON public.user_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interests"
  ON public.user_interests FOR DELETE
  USING (auth.uid() = user_id);

-- Interest categories and predefined interests: Public read access
CREATE POLICY "Anyone can view interest categories"
  ON public.interest_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view predefined interests"
  ON public.predefined_interests FOR SELECT
  USING (true);

-- ============================================================================
-- 10. Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.user_preferences IS 'User matching preferences for filtering potential matches';
COMMENT ON TABLE public.user_interests IS 'User interests for compatibility matching';
COMMENT ON TABLE public.interest_categories IS 'Categories for organizing interests';
COMMENT ON TABLE public.predefined_interests IS 'Predefined interests users can select from';

COMMENT ON COLUMN public.user_preferences.dealbreakers IS 'JSONB object indicating which preferences are dealbreakers (hard filters)';
COMMENT ON COLUMN public.profiles.height_inches IS 'Height in inches (36-96 inches = 3-8 feet)';
COMMENT ON COLUMN public.profiles.languages IS 'Array of language codes (ISO 639-1, e.g., ["en", "es"])';

