import { supabase } from '@/integrations/supabase/client';
import type { Gender, Preference } from './auth.service';

/**
 * Duo type
 */
export interface Duo {
  id: string;
  member1_id: string;
  member2_id: string;
  name?: string;
  tagline?: string;
  bio?: string;
  photo_url?: string;
  interests?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Duo with member profiles (including gender and preference)
 * Note: location is excluded from relationship queries due to PostGIS POINT type compatibility issues
 * Location can be fetched separately if needed
 */
export interface DuoWithMembers extends Duo {
  member1: {
    id: string;
    name: string;
    age?: number;
    photo_url?: string;
    gender?: Gender;
    preference?: Preference;
    location?: string | { coordinates: [number, number] }; // Optional - not included in relationship queries
  };
  member2: {
    id: string;
    name: string;
    age?: number;
    photo_url?: string;
    gender?: Gender;
    preference?: Preference;
    location?: string | { coordinates: [number, number] }; // Optional - not included in relationship queries
  };
}

/**
 * Validate interests array
 */
function validateInterests(interests?: string[]): string[] | undefined {
  if (!interests) return undefined;
  
  if (!Array.isArray(interests)) {
    throw new Error('Interests must be an array');
  }
  
  if (interests.length > 20) {
    throw new Error('Maximum 20 interests allowed');
  }
  
  // Normalize and deduplicate interests
  const normalized = interests
    .map(i => typeof i === 'string' ? i.trim().toLowerCase() : String(i).trim().toLowerCase())
    .filter(i => i.length > 0 && i.length <= 50) // Max 50 chars per interest
    .filter((value, index, self) => self.indexOf(value) === index) // Deduplicate
    .map(i => i.charAt(0).toUpperCase() + i.slice(1)); // Capitalize first letter
  
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Validate duo data
 */
function validateDuoData(data?: {
  name?: string;
  tagline?: string;
  bio?: string;
  photo_url?: string;
  interests?: string[];
}): {
  name?: string;
  tagline?: string;
  bio?: string;
  photo_url?: string;
  interests?: string[];
} | undefined {
  if (!data) return undefined;

  const validated: typeof data = {};

  // Validate name
  if (data.name !== undefined) {
    if (typeof data.name !== 'string') {
      throw new Error('Name must be a string');
    }
    const trimmed = data.name.trim();
    if (trimmed.length > 100) {
      throw new Error('Duo name must be less than 100 characters');
    }
    validated.name = trimmed.length > 0 ? trimmed : undefined;
  }

  // Validate tagline
  if (data.tagline !== undefined) {
    if (typeof data.tagline !== 'string') {
      throw new Error('Tagline must be a string');
    }
    const trimmed = data.tagline.trim();
    if (trimmed.length > 200) {
      throw new Error('Tagline must be less than 200 characters');
    }
    validated.tagline = trimmed.length > 0 ? trimmed : undefined;
  }

  // Validate bio
  if (data.bio !== undefined) {
    if (typeof data.bio !== 'string') {
      throw new Error('Bio must be a string');
    }
    const trimmed = data.bio.trim();
    if (trimmed.length > 1000) {
      throw new Error('Bio must be less than 1000 characters');
    }
    validated.bio = trimmed.length > 0 ? trimmed : undefined;
  }

  // Validate photo URL
  if (data.photo_url !== undefined) {
    if (typeof data.photo_url !== 'string') {
      throw new Error('Photo URL must be a string');
    }
    // Basic URL validation
    try {
      new URL(data.photo_url);
      validated.photo_url = data.photo_url;
    } catch {
      throw new Error('Photo URL must be a valid URL');
    }
  }

  // Validate interests
  validated.interests = validateInterests(data.interests);

  return Object.keys(validated).length > 0 ? validated : undefined;
}

/**
 * Create a new duo
 */
export async function createDuo(member1Id: string, member2Id: string, data?: {
  name?: string;
  tagline?: string;
  bio?: string;
  photo_url?: string;
  interests?: string[];
}): Promise<Duo> {
  // Validate member IDs
  if (!member1Id || typeof member1Id !== 'string') {
    throw new Error('Member 1 ID is required and must be a string');
  }
  if (!member2Id || typeof member2Id !== 'string') {
    throw new Error('Member 2 ID is required and must be a string');
  }
  if (member1Id === member2Id) {
    throw new Error('Cannot create duo with yourself');
  }

  // Verify both members exist
  const { data: member1, error: member1Error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', member1Id)
    .single();

  if (member1Error || !member1) {
    throw new Error('Member 1 does not exist');
  }

  const { data: member2, error: member2Error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', member2Id)
    .single();

  if (member2Error || !member2) {
    throw new Error('Member 2 does not exist');
  }

  // Validate and normalize duo data
  const validatedData = validateDuoData(data);

  // Note: Database trigger will automatically deactivate other active duos
  // when we insert with is_active = true, but we still do it here for immediate consistency
  // Get user's existing duos to deactivate them when creating a new active duo
  const { data: existingDuos } = await supabase
    .from('duos')
    .select('id')
    .or(`member1_id.eq.${member1Id},member2_id.eq.${member1Id}`)
    .eq('is_active', true);

  // Deactivate all existing active duos for this user (both as member1 and member2)
  if (existingDuos && existingDuos.length > 0) {
    const existingDuoIds = existingDuos.map(d => d.id);
    // Also check for duos where user is member2
    const { data: existingDuosAsMember2 } = await supabase
      .from('duos')
      .select('id')
      .eq('member2_id', member1Id)
      .eq('is_active', true);
    
    const allExistingDuoIds = [
      ...existingDuoIds,
      ...(existingDuosAsMember2?.map(d => d.id) || [])
    ];
    
    if (allExistingDuoIds.length > 0) {
      await supabase
        .from('duos')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', allExistingDuoIds);
    }
  }

  const { data: duo, error } = await supabase
    .from('duos')
    .insert({
      member1_id: member1Id,
      member2_id: member2Id,
      is_active: true, // New duo is always active
      ...validatedData,
    })
    .select()
    .single();

  if (error) throw error;
  return duo;
}

/**
 * Get duo by ID
 */
export async function getDuo(duoId: string): Promise<DuoWithMembers | null> {
  const { data, error } = await supabase
    .from('duos')
    .select(`
      *,
      member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
      member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
    `)
    .eq('id', duoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as DuoWithMembers;
}

/**
 * Get duos for a user
 */
export async function getUserDuos(userId: string): Promise<DuoWithMembers[]> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a string');
  }

  try {
    // First, try a simple query without foreign key relationships to check if user has any duos
    // Note: We fetch ALL duos (not just active) to allow users to manage multiple duos
    const { data: simpleData, error: simpleError } = await supabase
      .from('duos')
      .select('id')
      .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
      .limit(1);

    // If simple query fails, it's likely an RLS or connection issue
    if (simpleError) {
      // PGRST116 is "no rows returned" - this is fine, user just has no duos
      if (simpleError.code === 'PGRST116') {
        return [];
      }
      
      // 42501 is RLS policy violation
      if (simpleError.code === '42501') {
        console.error('RLS policy violation when fetching duos:', simpleError);
        throw new Error('Permission denied. Please check your database RLS policies. Error code: 42501');
      }
      
      // Log the error for debugging
      console.error('Error in simple duos query:', {
        code: simpleError.code,
        message: simpleError.message,
        details: simpleError.details,
        hint: simpleError.hint,
      });
      
      throw new Error(`Failed to load duos: ${simpleError.message || 'Unknown error'}${simpleError.code ? ` (Code: ${simpleError.code})` : ''}`);
    }

    // If no duos found, return empty array early
    if (!simpleData || simpleData.length === 0) {
      return [];
    }

    // Now fetch full data with relationships
    // Note: Excluding 'location' from the relationship query as PostGIS POINT type can cause issues
    // Location can be fetched separately if needed
    // Fetch ALL duos (not just active) to allow users to manage multiple duos
    const { data, error } = await supabase
      .from('duos')
      .select(`
        *,
        member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
        member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
      `)
      .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    // If error on full query, it might be a foreign key relationship issue
    if (error) {
      // PGRST116 is "no rows returned" - shouldn't happen here since we checked above, but handle it
      if (error.code === 'PGRST116') {
        return [];
      }
      
      // 42501 is RLS policy violation
      if (error.code === '42501') {
        console.error('RLS policy violation when fetching duos with relationships:', error);
        throw new Error('Permission denied when loading duo details. Please check your database RLS policies. Error code: 42501');
      }
      
      // PGRST202 is "foreign key relationship error" - might happen if profile doesn't exist
      if (error.code === 'PGRST202' || error.message?.includes('foreign key')) {
        console.error('Foreign key relationship error when fetching duos:', error);
        // Try to fetch duos without relationships as fallback
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('duos')
          .select('*')
          .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (fallbackError) {
          throw new Error(`Failed to load duos: ${fallbackError.message || 'Unknown error'}`);
        }
        
        // Return duos without member details (better than nothing)
        return (fallbackData || []).map(duo => ({
          ...duo,
          member1: { id: duo.member1_id } as any,
          member2: { id: duo.member2_id } as any,
        })) as DuoWithMembers[];
      }
      
      // For other errors, log them and throw with more context
      console.error('Error fetching user duos with relationships:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      // Create a more user-friendly error message
      const errorMessage = error.message || 'Failed to fetch duos';
      const enhancedError = new Error(`Failed to load duos: ${errorMessage}${error.code ? ` (Code: ${error.code})` : ''}`);
      (enhancedError as any).originalError = error;
      throw enhancedError;
    }
    
    // Return empty array if no data, otherwise return the data
    return (data || []) as DuoWithMembers[];
  } catch (error) {
    // If it's already an Error with a message, re-throw it
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise, wrap it in an Error
    throw new Error(`Unexpected error fetching duos: ${String(error)}`);
  }
}

/**
 * Update duo
 */
export async function updateDuo(duoId: string, updates: Partial<Duo>): Promise<Duo> {
  if (!duoId || typeof duoId !== 'string') {
    throw new Error('Duo ID is required and must be a string');
  }

  // Validate update data (extract only updatable fields)
  const updateData: Partial<Duo> = {};
  
  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string') {
      throw new Error('Name must be a string');
    }
    const trimmed = updates.name.trim();
    if (trimmed.length > 100) {
      throw new Error('Duo name must be less than 100 characters');
    }
    updateData.name = trimmed.length > 0 ? trimmed : null;
  }

  if (updates.tagline !== undefined) {
    if (typeof updates.tagline !== 'string') {
      throw new Error('Tagline must be a string');
    }
    const trimmed = updates.tagline.trim();
    if (trimmed.length > 200) {
      throw new Error('Tagline must be less than 200 characters');
    }
    updateData.tagline = trimmed.length > 0 ? trimmed : null;
  }

  if (updates.bio !== undefined) {
    if (typeof updates.bio !== 'string') {
      throw new Error('Bio must be a string');
    }
    const trimmed = updates.bio.trim();
    if (trimmed.length > 1000) {
      throw new Error('Bio must be less than 1000 characters');
    }
    updateData.bio = trimmed.length > 0 ? trimmed : null;
  }

  if (updates.photo_url !== undefined) {
    if (updates.photo_url !== null && typeof updates.photo_url !== 'string') {
      throw new Error('Photo URL must be a string or null');
    }
    if (updates.photo_url) {
      try {
        new URL(updates.photo_url);
        updateData.photo_url = updates.photo_url;
      } catch {
        throw new Error('Photo URL must be a valid URL');
      }
    } else {
      updateData.photo_url = null;
    }
  }

  if (updates.interests !== undefined) {
    updateData.interests = validateInterests(updates.interests);
  }

  if (updates.is_active !== undefined) {
    if (typeof updates.is_active !== 'boolean') {
      throw new Error('is_active must be a boolean');
    }
    updateData.is_active = updates.is_active;
    
    // If setting to active, deactivate other duos for both members
    // Note: Database trigger will also enforce this, but we do it here for immediate consistency
    if (updates.is_active === true) {
      // Get the duo to find both members
      const { data: currentDuo } = await supabase
        .from('duos')
        .select('member1_id, member2_id')
        .eq('id', duoId)
        .single();
      
      if (currentDuo) {
        // Deactivate other active duos for member1
        await supabase
          .from('duos')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .or(`member1_id.eq.${currentDuo.member1_id},member2_id.eq.${currentDuo.member1_id}`)
          .eq('is_active', true)
          .neq('id', duoId);
        
        // Deactivate other active duos for member2
        await supabase
          .from('duos')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .or(`member1_id.eq.${currentDuo.member2_id},member2_id.eq.${currentDuo.member2_id}`)
          .eq('is_active', true)
          .neq('id', duoId);
      }
    }
  }

  const { data, error } = await supabase
    .from('duos')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', duoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get active duos for matching (excluding user's duos)
 * Optimized to use server-side filtering when possible
 */
export async function getActiveDuosForMatching(userId: string, excludeDuoIds: string[] = []): Promise<DuoWithMembers[]> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a string');
  }

  // Build query - exclude user's duos
  // Note: Excluding 'location' from relationship query as PostGIS POINT type can cause issues
  let query = supabase
    .from('duos')
    .select(`
      *,
      member1:profiles!duos_member1_id_fkey(id, name, age, photo_url, gender, preference),
      member2:profiles!duos_member2_id_fkey(id, name, age, photo_url, gender, preference)
    `)
    .eq('is_active', true)
    .neq('member1_id', userId)
    .neq('member2_id', userId);

  // Optimize exclusion: if exclude list is small, use server-side filtering
  // For larger lists, fall back to client-side filtering
  if (excludeDuoIds.length > 0 && excludeDuoIds.length <= 50) {
    // Use multiple .neq() calls for small exclusion lists (more efficient than client-side)
    // Note: Supabase PostgREST doesn't support .not('id', 'in', array) directly,
    // but we can use a workaround with multiple conditions
    for (const excludeId of excludeDuoIds) {
      query = query.neq('id', excludeId);
    }
  }

  // Fetch with limit (adjust based on exclusion list size)
  const limit = excludeDuoIds.length > 50 ? 100 : 50;
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // If exclusion list is large, filter client-side using Set for O(1) lookup
  if (excludeDuoIds.length > 50) {
    const excludeSet = new Set(excludeDuoIds);
    const filtered = (data || []).filter(duo => !excludeSet.has(duo.id));
    return filtered.slice(0, 50) as DuoWithMembers[];
  }

  return (data || []).slice(0, 50) as DuoWithMembers[];
}

/**
 * Deactivate a duo (soft delete)
 */
export async function deactivateDuo(duoId: string): Promise<Duo> {
  const { data, error } = await supabase
    .from('duos')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', duoId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get the active duo for a user
 * @param duos - Array of user's duos
 * @returns The active duo, or null if none is active
 */
export function getActiveDuo(duos: DuoWithMembers[] | null | undefined): DuoWithMembers | null {
  if (!duos || duos.length === 0) return null;
  return duos.find(d => d.is_active) || null;
}

/**
 * Set a duo as active, deactivating all other duos for the user
 * @param duoId - The duo ID to activate
 * @param userId - The user ID (member1 or member2 of the duo)
 */
export async function setActiveDuo(duoId: string, userId: string): Promise<Duo> {
  if (!duoId || typeof duoId !== 'string') {
    throw new Error('Duo ID is required and must be a string');
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a string');
  }

  // Verify the duo exists and user is a member
  const { data: duo, error: duoError } = await supabase
    .from('duos')
    .select('id, member1_id, member2_id')
    .eq('id', duoId)
    .single();

  if (duoError || !duo) {
    throw new Error('Duo not found');
  }

  if (duo.member1_id !== userId && duo.member2_id !== userId) {
    throw new Error('User is not a member of this duo');
  }

  // Note: Database trigger will automatically deactivate other active duos
  // when we update is_active to true, but we still do it here for immediate consistency
  // Deactivate all other active duos for this user (both as member1 and member2)
  const { error: deactivateError } = await supabase
    .from('duos')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .or(`member1_id.eq.${userId},member2_id.eq.${userId}`)
    .eq('is_active', true)
    .neq('id', duoId);

  if (deactivateError) throw deactivateError;

  // Activate the selected duo
  // The database trigger will also ensure no other duos are active for either member
  const { data: activatedDuo, error: activateError } = await supabase
    .from('duos')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', duoId)
    .select()
    .single();

  if (activateError) throw activateError;
  return activatedDuo;
}

/**
 * Delete a duo (hard delete)
 */
export async function deleteDuo(duoId: string): Promise<void> {
  const { error } = await supabase
    .from('duos')
    .delete()
    .eq('id', duoId);

  if (error) throw error;
}

