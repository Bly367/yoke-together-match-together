import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { retryWithBackoff } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { 
  emailSchema, 
  passwordSchema, 
  nameSchema, 
  ageSchema,
  bioSchema
} from '@/lib/validation';
import { ValidationError, NotFoundError, AuthenticationError } from '@/lib/errors';
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
 * Validate email format using Zod schema
 */
function validateEmail(email: string): void {
  try {
    emailSchema.parse(email);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : 'Invalid email format',
      'email'
    );
  }
}

/**
 * Validate password strength using Zod schema
 */
function validatePassword(password: string): void {
  try {
    passwordSchema.parse(password);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : 'Invalid password format',
      'password'
    );
  }
}

/**
 * Validate name using Zod schema
 */
function validateName(name: string): void {
  try {
    nameSchema.parse(name);
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : 'Invalid name format',
      'name'
    );
  }
}

/**
 * Sign up a new user with email and password
 * 
 * Creates a new user account and associated profile. Uses retry logic to handle
 * potential race conditions with database triggers.
 * 
 * @param email - User's email address (must be valid email format)
 * @param password - User's password (must meet strength requirements: min 8 chars, uppercase, lowercase, number, special char)
 * @param name - User's display name (1-100 characters)
 * @returns Promise resolving to the created user profile
 * @throws {ValidationError} If email, password, or name validation fails
 * @throws {Error} If user creation fails or profile cannot be created after retries
 * 
 * @example
 * ```typescript
 * try {
 *   const profile = await signUp('user@example.com', 'SecurePass123!', 'John Doe');
 *   console.log('User created:', profile.id);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Validation failed:', error.message);
 *   }
 * }
 * ```
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
            logger.error('Profile update error', updateError, { userId: existingProfile.id });
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
    logger.error('Profile creation/retrieval failed after retries', error, { userId: data.user.id });
    throw error;
  }

  return profile;
}

/**
 * Sign in an existing user with email and password
 * 
 * Authenticates the user and returns their profile. Creates a profile if one doesn't exist
 * (for backward compatibility with older accounts).
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise resolving to the user's profile
 * @throws {ValidationError} If email is invalid or password is empty
 * @throws {Error} If authentication fails or profile cannot be retrieved/created
 * 
 * @example
 * ```typescript
 * try {
 *   const profile = await signIn('user@example.com', 'password123');
 *   console.log('Signed in:', profile.name);
 * } catch (error) {
 *   console.error('Sign in failed:', error.message);
 * }
 * ```
 */
export async function signIn(email: string, password: string): Promise<UserProfile> {
  // Validate inputs
  validateEmail(email);
  if (!password || password.length === 0) {
    throw new ValidationError('Password is required', 'password');
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
 * Sign out the current authenticated user
 * 
 * Clears the user's session and authentication tokens.
 * 
 * @returns Promise that resolves when sign out is complete
 * @throws {Error} If sign out fails
 * 
 * @example
 * ```typescript
 * await signOut();
 * // User is now signed out
 * ```
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current user profile
 */
/**
 * Get current user profile
 * @returns User profile or null if not authenticated
 * @throws {NotFoundError} If profile doesn't exist and can't be created
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  // If Supabase is not configured, return null immediately
  if (!isSupabaseConfigured()) {
    logger.warn('Supabase not configured, returning null user');
    return null;
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Handle auth errors gracefully
    if (authError) {
      // If it's a network error or invalid configuration, return null
      if (authError.message?.includes('fetch') || 
          authError.message?.includes('Failed to fetch') ||
          authError.message?.includes('NetworkError') ||
          authError.message?.includes('Invalid API key')) {
        logger.error('Supabase auth error (likely configuration issue)', authError);
        return null;
      }
      // For other auth errors, log and return null (user not authenticated)
      logger.debug('Auth error (user not authenticated)', authError);
      return null;
    }
    
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select()
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      // If profile doesn't exist, return null (user needs to complete profile setup)
      if (error.code === 'PGRST116') {
        return null;
      }
      
      // Handle 406 (Not Acceptable) - might be RLS or content negotiation issue
      if (error.status === 406) {
        logger.warn('Profile query returned 406, might be RLS issue', error);
        return null;
      }
      
      // Handle network/configuration errors gracefully
      if (error.message?.includes('fetch') || 
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError')) {
        logger.error('Supabase query error (likely configuration issue)', error);
        return null;
      }
      
      // Use shared error handler for other errors
      handleProfileError(error, 'fetch');
    }
    return profile;
  } catch (error: any) {
    // Catch any unexpected errors and log them
    logger.error('Unexpected error in getCurrentUser', error);
    
    // If it's a network error or configuration issue, return null instead of crashing
    if (error?.message?.includes('fetch') || 
        error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('NetworkError') ||
        error?.message?.includes('Invalid API key') ||
        error?.message?.includes('placeholder')) {
      return null;
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Validate profile update fields
 */
function validateProfileUpdate(profile: Partial<UserProfile>): void {
  // Validate age if provided
  if (profile.age !== undefined) {
    try {
      ageSchema.parse(profile.age);
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : 'Invalid age',
        'age'
      );
    }
  }

  // Validate bio length if provided
  if (profile.bio !== undefined && profile.bio !== null) {
    try {
      bioSchema.parse(profile.bio);
    } catch (error) {
      throw new ValidationError(
        error instanceof Error ? error.message : 'Invalid bio',
        'bio'
      );
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

  // Validate photo_url if provided
  if (profile.photo_url !== undefined) {
    if (profile.photo_url !== null && profile.photo_url !== '') {
      // Validate URL format
      try {
        new URL(profile.photo_url);
      } catch {
        throw new ValidationError('Photo URL must be a valid URL', 'photo_url');
      }
    }
  }
}

/**
 * Update user profile
 */
/**
 * Update user profile
 * @param profile - Partial profile data to update
 * @returns Updated user profile
 * @throws {AuthenticationError} If user is not authenticated
 * @throws {ValidationError} If profile data is invalid
 */
export async function updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AuthenticationError('Not authenticated');

  // Validate profile update fields
  validateProfileUpdate(profile);

  // Filter out undefined values to avoid issues with Supabase
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  // Only include defined values in the update
  Object.keys(profile).forEach((key) => {
    const value = profile[key as keyof UserProfile];
    if (value !== undefined) {
      // Convert empty strings to null for optional fields (like photo_url)
      if (value === '' && (key === 'photo_url' || key === 'bio')) {
        updateData[key] = null;
      } else {
        updateData[key] = value;
      }
    }
  });

  // Try update without select first to avoid 406 errors
  // The 406 error can occur when UPDATE with SELECT fails due to RLS
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (updateError) {
    logger.error('Profile update failed', updateError, { userId: user.id, updateData });
    
    // Handle 406 errors - might be RLS policy issue
    if ((updateError as any)?.status === 406) {
      logger.warn('Profile update returned 406 - checking RLS policy', { userId: user.id });
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (existingProfile) {
        throw new Error('Profile update failed due to RLS policy. Please check your database policies.');
      } else {
        throw new Error('Profile does not exist. Please create your profile first.');
      }
    }
    
    throw updateError;
  }

  // Update succeeded, now fetch the profile
  const { data: fetchedData, error: fetchError } = await supabase
    .from('profiles')
    .select()
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    // Handle 406 errors gracefully - update worked but can't fetch due to RLS
    if ((fetchError as any)?.status === 406) {
      logger.warn('Profile update succeeded but fetch returned 406 (RLS issue)', { userId: user.id });
      // Return a partial profile with the updated data
      // The user will see the update on next page load
      return {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || 'User',
        ...updateData,
        created_at: new Date().toISOString(),
        updated_at: updateData.updated_at,
      } as UserProfile;
    }
    logger.error('Failed to fetch profile after update', fetchError, { userId: user.id });
    throw fetchError;
  }

  if (!fetchedData) {
    // Update worked but no data returned - return partial profile
    logger.warn('Profile update succeeded but fetch returned no data', { userId: user.id });
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || 'User',
      ...updateData,
      created_at: new Date().toISOString(),
      updated_at: updateData.updated_at,
    } as UserProfile;
  }

  return fetchedData;
}

/**
 * Find a user profile by email address
 * 
 * Useful for looking up users by email (e.g., for invitations, friend requests).
 * Returns null if no profile is found (does not throw an error).
 * 
 * @param email - Email address to search for
 * @returns Promise resolving to profile with id, name, and email, or null if not found
 * @throws {ValidationError} If email format is invalid
 * 
 * @example
 * ```typescript
 * const profile = await findProfileByEmail('friend@example.com');
 * if (profile) {
 *   console.log('Found user:', profile.name);
 * } else {
 *   console.log('User not found');
 * }
 * ```
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
 * Send password reset email to user
 * 
 * Sends an email with a password reset link. The link will redirect to the reset password
 * page (or custom redirect URL if provided) where the user can set a new password.
 * 
 * @param email - User's email address
 * @param redirectTo - Optional custom redirect URL after password reset (defaults to /reset-password)
 * @returns Promise that resolves when email is sent
 * @throws {ValidationError} If email format is invalid
 * @throws {Error} If email sending fails
 * 
 * @example
 * ```typescript
 * try {
 *   await resetPassword('user@example.com');
 *   toast.success('Password reset email sent!');
 * } catch (error) {
 *   toast.error('Failed to send reset email');
 * }
 * ```
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
 * Update user's password with reset token
 * 
 * Updates the password for the currently authenticated user. Requires a valid session
 * (typically obtained from the password reset link).
 * 
 * @param newPassword - New password to set (must meet strength requirements)
 * @returns Promise that resolves when password is updated
 * @throws {ValidationError} If password doesn't meet strength requirements
 * @throws {Error} If password update fails (e.g., invalid session, expired token)
 * 
 * @example
 * ```typescript
 * try {
 *   await updatePassword('NewSecurePass123!');
 *   toast.success('Password updated successfully!');
 * } catch (error) {
 *   toast.error('Failed to update password');
 * }
 * ```
 */
export async function updatePassword(newPassword: string): Promise<void> {
  // Validate password
  validatePassword(newPassword);

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

