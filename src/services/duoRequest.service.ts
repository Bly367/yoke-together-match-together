import { supabase } from '@/integrations/supabase/client';

/**
 * Duo request status
 */
export type DuoRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

/**
 * Duo request type
 */
export interface DuoRequest {
  id: string;
  requester_id: string;
  requested_id: string;
  status: DuoRequestStatus;
  message?: string;
  duo_name?: string;
  duo_tagline?: string;
  duo_bio?: string;
  duo_interests?: string[];
  duo_photo_url?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  requester?: {
    id: string;
    name: string;
    email: string;
    photo_url?: string;
  };
  requested?: {
    id: string;
    name: string;
    email: string;
    photo_url?: string;
  };
}

/**
 * Create a duo request
 */
export async function createDuoRequest(
  requesterId: string,
  requestedId: string,
  options?: {
    message?: string;
    duoName?: string;
    tagline?: string;
    bio?: string;
    interests?: string[];
    photoUrl?: string;
    expiresInDays?: number; // Default 14 days
  }
): Promise<DuoRequest> {
  const {
    message,
    duoName,
    tagline,
    bio,
    interests,
    photoUrl,
    expiresInDays = 14,
  } = options || {};
  if (!requesterId || typeof requesterId !== 'string') {
    throw new Error('Requester ID is required');
  }
  if (!requestedId || typeof requestedId !== 'string') {
    throw new Error('Requested ID is required');
  }
  if (requesterId === requestedId) {
    throw new Error('Cannot send request to yourself');
  }

  // Check if there's already a pending request between these users
  // Check both directions: requester->requested and requested->requester
  const { data: request1 } = await supabase
    .from('duo_requests')
    .select('id, status')
    .eq('requester_id', requesterId)
    .eq('requested_id', requestedId)
    .eq('status', 'pending')
    .maybeSingle();

  const { data: request2 } = await supabase
    .from('duo_requests')
    .select('id, status')
    .eq('requester_id', requestedId)
    .eq('requested_id', requesterId)
    .eq('status', 'pending')
    .maybeSingle();

  const existingRequest = request1 || request2;

  if (existingRequest) {
    throw new Error('You already have a pending request with this person. Please wait for them to respond or cancel your existing request.');
  }

  // Check if duo already exists (check both member positions)
  const { data: duo1 } = await supabase
    .from('duos')
    .select('id')
    .eq('member1_id', requesterId)
    .eq('member2_id', requestedId)
    .maybeSingle();

  const { data: duo2 } = await supabase
    .from('duos')
    .select('id')
    .eq('member1_id', requestedId)
    .eq('member2_id', requesterId)
    .maybeSingle();

  const existingDuo = duo1 || duo2;

  if (existingDuo) {
    throw new Error('You already have a duo with this person. You can manage it from your profile.');
  }

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabase
    .from('duo_requests')
    .insert({
      requester_id: requesterId,
      requested_id: requestedId,
      message: message?.trim() || null,
      duo_name: duoName?.trim() || null,
      duo_tagline: tagline?.trim() || null,
      duo_bio: bio?.trim() || null,
      duo_interests: interests && interests.length > 0 ? interests : null,
      duo_photo_url: photoUrl?.trim() || null,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select(`
      *,
      requester:profiles!duo_requests_requester_id_fkey(id, name, email, photo_url),
      requested:profiles!duo_requests_requested_id_fkey(id, name, email, photo_url)
    `)
    .single();

  if (error) throw error;
  return data as DuoRequest;
}

/**
 * Get duo requests for a user (sent and received)
 */
export async function getDuoRequests(userId: string): Promise<{
  sent: DuoRequest[];
  received: DuoRequest[];
}> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required');
  }

  const selectQuery = `
    *,
    requester:profiles!duo_requests_requester_id_fkey(id, name, email, photo_url),
    requested:profiles!duo_requests_requested_id_fkey(id, name, email, photo_url)
  `;

  // Get sent requests
  const { data: sent, error: sentError } = await supabase
    .from('duo_requests')
    .select(selectQuery)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (sentError) throw sentError;

  // Get received requests
  const { data: received, error: receivedError } = await supabase
    .from('duo_requests')
    .select(selectQuery)
    .eq('requested_id', userId)
    .order('created_at', { ascending: false });

  if (receivedError) throw receivedError;

  return {
    sent: (sent || []) as DuoRequest[],
    received: (received || []) as DuoRequest[],
  };
}

/**
 * Get pending requests received by a user
 */
export async function getPendingRequests(userId: string): Promise<DuoRequest[]> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required');
  }

  const { data, error } = await supabase
    .from('duo_requests')
    .select(`
      *,
      requester:profiles!duo_requests_requester_id_fkey(id, name, email, photo_url)
    `)
    .eq('requested_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DuoRequest[];
}

/**
 * Accept a duo request
 * Can accept pending or previously rejected requests
 */
export async function acceptDuoRequest(requestId: string): Promise<DuoRequest> {
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('Request ID is required');
  }

  // First, check if request exists and get its current status
  const { data: existingRequest, error: fetchError } = await supabase
    .from('duo_requests')
    .select('id, status')
    .eq('id', requestId)
    .single();

  if (fetchError || !existingRequest) {
    throw new Error('Request not found');
  }

  // Allow accepting pending or rejected requests
  if (existingRequest.status !== 'pending' && existingRequest.status !== 'rejected') {
    if (existingRequest.status === 'accepted') {
      throw new Error('This request has already been accepted');
    }
    if (existingRequest.status === 'cancelled') {
      throw new Error('This request was cancelled. Please resend a new request.');
    }
    throw new Error(`Cannot accept a request with status: ${existingRequest.status}`);
  }

  const { data, error } = await supabase
    .from('duo_requests')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .in('status', ['pending', 'rejected'])
    .select(`
      *,
      requester:profiles!duo_requests_requester_id_fkey(id, name, email, photo_url),
      requested:profiles!duo_requests_requested_id_fkey(id, name, email, photo_url)
    `)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Request not found or already processed. It may have been cancelled or expired.');
    }
    throw error;
  }

  return data as DuoRequest;
}

/**
 * Reject a duo request
 */
export async function rejectDuoRequest(requestId: string): Promise<DuoRequest> {
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('Request ID is required');
  }

  const { data, error } = await supabase
    .from('duo_requests')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Request not found or already processed. It may have been cancelled or expired.');
    }
    throw error;
  }

  return data as DuoRequest;
}

/**
 * Cancel a duo request (by requester)
 */
export async function cancelDuoRequest(requestId: string): Promise<void> {
  if (!requestId || typeof requestId !== 'string') {
    throw new Error('Request ID is required');
  }

  const { error } = await supabase
    .from('duo_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

/**
 * Leave a duo (deactivate it for the current user)
 * Note: This deactivates the duo, but doesn't delete it
 * The other member can reactivate it if they want
 */
export async function leaveDuo(duoId: string, userId: string): Promise<void> {
  if (!duoId || typeof duoId !== 'string') {
    throw new Error('Duo ID is required');
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required');
  }

  // Verify user is a member of the duo
  const { data: duo, error: duoError } = await supabase
    .from('duos')
    .select('member1_id, member2_id')
    .eq('id', duoId)
    .single();

  if (duoError || !duo) {
    throw new Error('Duo not found');
  }

  if (duo.member1_id !== userId && duo.member2_id !== userId) {
    throw new Error('You are not a member of this duo');
  }

  // Deactivate the duo
  const { error } = await supabase
    .from('duos')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', duoId);

  if (error) throw error;
}

/**
 * Subscribe to duo requests for real-time updates
 */
export function subscribeToDuoRequests(
  userId: string,
  callbacks: {
    onNewRequest?: (request: DuoRequest) => void;
    onRequestUpdate?: (request: DuoRequest) => void;
  }
): () => void {
  const channel = supabase
    .channel(`duo-requests:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'duo_requests',
        filter: `requested_id=eq.${userId}`,
      },
      async (payload) => {
        const newRequest = payload.new as DuoRequest;
        if (newRequest.status === 'pending' && callbacks.onNewRequest) {
          // Fetch full request with profile data
          const { data } = await supabase
            .from('duo_requests')
            .select(`
              *,
              requester:profiles!duo_requests_requester_id_fkey(id, name, email, photo_url)
            `)
            .eq('id', newRequest.id)
            .single();
          
          if (data) callbacks.onNewRequest(data as DuoRequest);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'duo_requests',
        filter: `requester_id=eq.${userId},requested_id=eq.${userId}`,
      },
      async (payload) => {
        if (callbacks.onRequestUpdate) {
          // Fetch full request with profile data
          const { data } = await supabase
            .from('duo_requests')
            .select(`
              *,
              requester:profiles!duo_requests_requester_id_fkey(id, name, email, photo_url),
              requested:profiles!duo_requests_requested_id_fkey(id, name, email, photo_url)
            `)
            .eq('id', payload.new.id)
            .single();
          
          if (data) callbacks.onRequestUpdate(data as DuoRequest);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Check and expire old pending requests
 */
export async function expireOldRequests(): Promise<void> {
  const { error } = await supabase.rpc('expire_old_duo_requests');
  if (error) throw error;
}

