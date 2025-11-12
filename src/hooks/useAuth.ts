import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signUp, signIn, signOut, getCurrentUser, updateProfile, type UserProfile } from '@/services/auth.service';

/**
 * Get current user query key
 */
const CURRENT_USER_KEY = ['auth', 'currentUser'] as const;

/**
 * Hook to get current user
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: getCurrentUser,
    retry: false,
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
 * Hook to update profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile: Partial<UserProfile>) => updateProfile(profile),
    onSuccess: (user) => {
      queryClient.setQueryData(CURRENT_USER_KEY, user);
    },
  });
}

