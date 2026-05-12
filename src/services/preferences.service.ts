import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * User preferences for matching
 */
export interface UserPreferences {
  id: string;
  user_id: string;
  min_age?: number;
  max_age?: number;
  max_distance_miles?: number;
  min_height_inches?: number;
  max_height_inches?: number;
  education_levels?: string[];
  religions?: string[];
  political_views?: string[];
  drinking_habits?: string[];
  smoking_habits?: string[];
  exercise_frequencies?: string[];
  relationship_goals?: string[];
  has_kids_preference?: 'yes' | 'no' | 'either' | 'prefer-not-to-say';
  wants_kids_preference?: 'yes' | 'no' | 'maybe' | 'either' | 'prefer-not-to-say';
  languages?: string[];
  ethnicities?: string[];
  dealbreakers?: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

/**
 * User interest
 */
export interface UserInterest {
  id: string;
  user_id: string;
  interest: string;
  created_at: string;
}

/**
 * Interest category
 */
export interface InterestCategory {
  id: string;
  name: string;
  display_name: string;
  icon?: string;
  created_at: string;
}

/**
 * Predefined interest
 */
export interface PredefinedInterest {
  id: string;
  category_id?: string;
  name: string;
  display_name: string;
  created_at: string;
}

/**
 * Extended profile demographics
 */
export interface ProfileDemographics {
  height_inches?: number;
  education_level?: string;
  religion?: string;
  political_views?: string;
  drinking_habit?: string;
  smoking_habit?: string;
  exercise_frequency?: string;
  relationship_goal?: string;
  has_kids?: string;
  wants_kids?: string;
  languages?: string[];
  ethnicity?: string;
  occupation?: string;
  pets?: string[];
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    // Log error but don't throw for 406 (Not Acceptable) - might be RLS or table issue
    if (error.code === 'PGRST116' || error.message?.includes('406') || (typeof error.details === 'string' && error.details.includes('406'))) {
      // No preferences found or table doesn't exist/not accessible
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Create or update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPreferences> {
  // Validate age range
  if (preferences.min_age !== undefined && preferences.max_age !== undefined) {
    if (preferences.min_age > preferences.max_age) {
      throw new Error('Minimum age must be less than or equal to maximum age');
    }
  }

  // Validate height range
  if (preferences.min_height_inches !== undefined && preferences.max_height_inches !== undefined) {
    if (preferences.min_height_inches > preferences.max_height_inches) {
      throw new Error('Minimum height must be less than or equal to maximum height');
    }
  }

  // Validate distance
  if (preferences.max_distance_miles !== undefined && preferences.max_distance_miles <= 0) {
    throw new Error('Maximum distance must be greater than 0');
  }

  // Upsert preferences
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user interests
 */
export async function getUserInterests(userId: string): Promise<UserInterest[]> {
  const { data, error } = await supabase
    .from('user_interests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Add user interest
 */
export async function addUserInterest(userId: string, interest: string): Promise<UserInterest> {
  const { data, error } = await supabase
    .from('user_interests')
    .insert({
      user_id: userId,
      interest: interest.trim().toLowerCase(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - interest already exists
      throw new Error('Interest already added');
    }
    throw error;
  }

  return data;
}

/**
 * Remove user interest
 */
export async function removeUserInterest(userId: string, interest: string): Promise<void> {
  const { error } = await supabase
    .from('user_interests')
    .delete()
    .eq('user_id', userId)
    .eq('interest', interest.trim().toLowerCase());

  if (error) throw error;
}

/**
 * Get all interest categories
 */
export async function getInterestCategories(): Promise<InterestCategory[]> {
  const { data, error } = await supabase
    .from('interest_categories')
    .select('*')
    .order('display_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get predefined interests
 */
export async function getPredefinedInterests(categoryId?: string): Promise<PredefinedInterest[]> {
  let query = supabase
    .from('predefined_interests')
    .select('*')
    .order('display_name', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get user profile demographics
 */
export async function getUserDemographics(userId: string): Promise<Partial<ProfileDemographics> | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('height_inches, education_level, religion, political_views, drinking_habit, smoking_habit, exercise_frequency, relationship_goal, has_kids, wants_kids, languages, ethnicity')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Update user profile demographics
 */
export async function updateUserDemographics(
  userId: string,
  demographics: Partial<ProfileDemographics>
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(demographics)
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Get match count estimate based on preferences
 * This is a simplified estimate - actual matching logic is more complex
 */
export async function getMatchCountEstimate(
  userId: string,
  preferences?: Partial<UserPreferences>
): Promise<number> {
  // Get user's preferences or use provided ones
  const userPrefs = preferences || await getUserPreferences(userId);
  
  if (!userPrefs) {
    // No preferences set, return a default estimate
    return 0;
  }

  // Build query to count potential matches
  // This is a simplified version - actual implementation would be more complex
  // and would consider duo matching logic
  let query = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .neq('id', userId);

  // Apply age filter if set
  if (userPrefs.min_age !== undefined || userPrefs.max_age !== undefined) {
    if (userPrefs.min_age !== undefined) {
      query = query.gte('age', userPrefs.min_age);
    }
    if (userPrefs.max_age !== undefined) {
      query = query.lte('age', userPrefs.max_age);
    }
  }

  // Apply education filter if set
  if (userPrefs.education_levels && userPrefs.education_levels.length > 0) {
    query = query.in('education_level', userPrefs.education_levels);
  }

  // Apply religion filter if set
  if (userPrefs.religions && userPrefs.religions.length > 0) {
    query = query.in('religion', userPrefs.religions);
  }

  // Apply relationship goal filter if set
  if (userPrefs.relationship_goals && userPrefs.relationship_goals.length > 0) {
    query = query.in('relationship_goal', userPrefs.relationship_goals);
  }

  const { count, error } = await query;

  if (error) throw error;
  return count || 0;
}

