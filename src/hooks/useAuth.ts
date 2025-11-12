import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signUp, signIn, signOut, getCurrentUser, updateProfile, findProfileByEmail, resetPassword, updatePassword, type UserProfile } from '@/services/auth.service';

/**
 * Get current user query key
 */
export const CURRENT_USER_KEY = ['auth', 'currentUser'] as const;

/**
 * Hook to get current user
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: getCurrentUser,
    retry: (failureCount, error) => {
      // Don't retry on auth errors (401, 403, or "Not authenticated")
      if (error?.message?.includes('Not authenticated') || 
          error?.message?.includes('authentication') ||
          error?.message?.includes('permission')) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.setQueryData(CURRENT_USER_KEY, null);
      queryClient.clear();
    },
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
    signOut: signOutMutation.mutate,
    isSigningOut: signOutMutation.isPending,
    signOutError: signOutMutation.error, // Expose sign-out errors
  };
}

/**
 * Hook to sign up
 */
export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      signUp(email, password, name),
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_KEY, user);
    },
  });
}

/**
 * Hook to sign in
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_KEY, user);
    },
  });
}

/**
 * Hook to update profile with optimistic updates
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile: Partial<UserProfile>) => updateProfile(profile),
    onMutate: async (newProfile) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CURRENT_USER_KEY });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData<UserProfile | null>(CURRENT_USER_KEY);

      // Optimistically update user profile
      if (previousUser) {
        queryClient.setQueryData(CURRENT_USER_KEY, {
          ...previousUser,
          ...newProfile,
        });
      }

      return { previousUser };
    },
    onError: (err, newProfile, context) => {
      // Rollback on error
      if (context?.previousUser !== undefined) {
        queryClient.setQueryData(CURRENT_USER_KEY, context.previousUser);
      }
    },
    onSuccess: (user) => {
      // Update with server response
      queryClient.setQueryData(CURRENT_USER_KEY, user);
    },
  });
}

/**
 * Hook to find profile by email
 */
export function useFindProfileByEmail() {
  return useMutation({
    mutationFn: (email: string) => findProfileByEmail(email),
  });
}

/**
 * Hook to send password reset email
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ email, redirectTo }: { email: string; redirectTo?: string }) =>
      resetPassword(email, redirectTo),
  });
}

/**
 * Hook to update password with reset token
 */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => updatePassword(newPassword),
  });
}

