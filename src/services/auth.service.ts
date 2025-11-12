import { supabase } from '@/integrations/supabase/client';
import { retryWithBackoff, isValidEmail } from '@/lib/utils';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * User gender options
 */
export type Gender = 'man' | 'woman' | 'non-binary' | 'prefer-not-to-say';

/**
 * User preference options (who they want to match with)
 */
export type Preference = 'men' | 'women' | 'both';

/**
 * User profile type
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age?: number;
  bio?: string;
  photo_url?: string;
  gender?: Gender;
  preference?: Preference; // Who they want to match with (defaults to 'both')
  location?: string | { coordinates: [number, number] }; // PostGIS POINT format
  location_updated_at?: string;
  location_visible?: boolean; // Privacy setting: hide/show location (defaults to true for backward compatibility)
  created_at: string;
  updated_at: string;
}

/**
 * Handle profile-related errors with helpful messages
 * Extracted to shared helper to avoid code duplication
 */
function handleProfileError(error: PostgrestError, context: 'fetch' | 'create' | 'update' = 'fetch'): never {
  // If profile table doesn't exist
  if (error.code === '42P01' || error.message.includes('does not exist')) {
    throw new Error('Database schema not applied. Please apply the database schema in Supabase SQL Editor. See SETUP_INSTRUCTIONS.md for details.');
  }
  
  // If RLS policy violation
  if (error.code === '42501' || error.message.includes('row-level security')) {
    throw new Error('RLS policy violation. Please run scripts/create-profile-trigger.sql to automatically create profiles, or run scripts/fix-rls-policies.sql to fix RLS policies.');
  }
  
  // Re-throw other errors
  throw error;
}

/**
 * Validate email format
 */
function validateEmail(email: string): void {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }
}

/**
 * Validate password strength
 */
function validatePassword(password: string): void {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    throw new Error('Password must be less than 128 characters');
  }
}

/**
 * Validate name
 */
function validateName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Name is required');
  }
  if (name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters long');
  }
  if (name.length > 100) {
    throw new Error('Name must be less than 100 characters');
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, name: string): Promise<UserProfile> {
  // Validate inputs
  validateEmail(email);
  validatePassword(password);
  validateName(name);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Failed to create user');

  // Retry logic to wait for profile creation (trigger may create it automatically)
  // Use retry with exponential backoff instead of fixed setTimeout
  let profile;
  try {
    profile = await retryWithBackoff(async () => {
      // Check if profile already exists (created by trigger)
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select()
        .eq('id', data.user.id)
        .single();

      if (existingProfile && !fetchError) {
        // Profile was created by trigger, update it with the name if needed
        if (existingProfile.name !== name || existingProfile.email !== email) {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ name, email })
            .eq('id', data.user.id)
            .select()
            .single();
          
          if (updateError) {
            console.error('Profile update error:', updateError);
            // Profile exists, return it even if update failed
            return existingProfile;
          }
          return updatedProfile;
        }
        return existingProfile;
      }

      // Profile doesn't exist, create it manually
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email,
          name,
        })
        .select()
        .single();

      if (profileError) {
        // If profile still doesn't exist after retries, throw error
        if (profileError.code === 'PGRST116') {
          throw new Error('Profile not found after retries');
        }
        // Use shared error handler for other errors
        handleProfileError(profileError, 'create');
      }
      
      return newProfile;
    }, 5, 100); // 5 attempts, starting with 100ms delay
  } catch (error) {
    console.error('Profile creation/retrieval failed after retries:', error);
    throw error;
  }

  return profile;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<UserProfile> {
  // Validate inputs
  validateEmail(email);
  if (!password || password.length === 0) {
    throw new Error('Password is required');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Failed to sign in');

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select()
    .eq('id', data.user.id)
    .single();

  if (profileError) {
    // If profile doesn't exist, create it
    if (profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || 'User',
        })
        .select()
        .single();
      
      if (createError) {
        handleProfileError(createError, 'create');
      }
      return newProfile;
    }
    // Use shared error handler for other errors
    handleProfileError(profileError, 'fetch');
  }
  return profile;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .single();

  if (error) {
    // If profile doesn't exist, return null (user needs to complete profile setup)
    if (error.code === 'PGRST116') {
      return null;
    }
    // Use shared error handler for other errors
    handleProfileError(error, 'fetch');
  }
  return profile;
}

/**
 * Validate profile update fields
 */
function validateProfileUpdate(profile: Partial<UserProfile>): void {
  // Validate age if provided
  if (profile.age !== undefined) {
    if (typeof profile.age !== 'number' || isNaN(profile.age)) {
      throw new Error('Age must be a valid number');
    }
    if (profile.age < 18 || profile.age > 120) {
      throw new Error('Age must be between 18 and 120');
    }
  }

  // Validate bio length if provided
  if (profile.bio !== undefined) {
    if (typeof profile.bio !== 'string') {
      throw new Error('Bio must be a string');
    }
    if (profile.bio.length > 500) {
      throw new Error('Bio must be less than 500 characters');
    }
  }

  // Validate name if provided
  if (profile.name !== undefined) {
    validateName(profile.name);
  }

  // Validate email if provided
  if (profile.email !== undefined) {
    validateEmail(profile.email);
  }

  // Validate gender if provided
  if (profile.gender !== undefined) {
    const validGenders: Gender[] = ['man', 'woman', 'non-binary', 'prefer-not-to-say'];
    if (!validGenders.includes(profile.gender)) {
      throw new Error(`Gender must be one of: ${validGenders.join(', ')}`);
    }
  }

  // Validate preference if provided
  if (profile.preference !== undefined) {
    const validPreferences: Preference[] = ['men', 'women', 'both'];
    if (!validPreferences.includes(profile.preference)) {
      throw new Error(`Preference must be one of: ${validPreferences.join(', ')}`);
    }
  }
}

/**
 * Update user profile
 */
export async function updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Validate profile update fields
  validateProfileUpdate(profile);

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...profile,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find profile by email
 */
export async function findProfileByEmail(email: string): Promise<Pick<UserProfile, 'id' | 'name' | 'email'> | null> {
  // Validate email
  validateEmail(email);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .eq('email', email)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    // Use shared error handler for other errors
    handleProfileError(error, 'fetch');
  }
  return data;
}

/**
 * Send password reset email
 * @param email - User's email address
 * @param redirectTo - Optional redirect URL after password reset (defaults to reset password page)
 */
export async function resetPassword(email: string, redirectTo?: string): Promise<void> {
  // Validate email
  validateEmail(email);

  // Default redirect URL to reset password page
  const defaultRedirectTo = `${window.location.origin}/reset-password`;
  const redirectUrl = redirectTo || defaultRedirectTo;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) throw error;
}

/**
 * Update password with reset token
 * @param newPassword - New password to set
 */
export async function updatePassword(newPassword: string): Promise<void> {
  // Validate password
  validatePassword(newPassword);

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

