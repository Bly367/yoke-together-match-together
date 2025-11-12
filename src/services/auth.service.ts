import { supabase } from '@/integrations/supabase/client';

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
  created_at: string;
  updated_at: string;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, name: string): Promise<UserProfile> {
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

  // Create profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      email,
      name,
    })
    .select()
    .single();

  if (profileError) throw profileError;
  return profile;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<UserProfile> {
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

  if (profileError) throw profileError;
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

  if (error) throw error;
  return profile;
}

/**
 * Update user profile
 */
export async function updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

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

