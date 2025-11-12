import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '@/services/auth.service';
import { clearLocationCache } from '@/services/location.service';
import { useAuth } from './useAuth';
import { CURRENT_USER_KEY } from './useAuth';

/**
 * Hook to manage location privacy settings
 * Allows users to hide/show their location from other users
 */
export function useLocationPrivacy() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const updateLocationPrivacyMutation = useMutation({
    mutationFn: (locationVisible: boolean) => {
      if (!user) throw new Error('Not authenticated');
      return updateProfile({ location_visible: locationVisible });
    },
    onMutate: async (locationVisible) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CURRENT_USER_KEY });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(CURRENT_USER_KEY);

      // Optimistically update location privacy
      if (previousUser) {
        queryClient.setQueryData(CURRENT_USER_KEY, {
          ...previousUser,
          location_visible: locationVisible,
        });
      }

      return { previousUser };
    },
    onError: (err, locationVisible, context) => {
      // Rollback on error
      if (context?.previousUser !== undefined) {
        queryClient.setQueryData(CURRENT_USER_KEY, context.previousUser);
      }
    },
    onSuccess: (user) => {
      // Update with server response
      queryClient.setQueryData(CURRENT_USER_KEY, user);
      
      // Invalidate location cache when privacy changes
      // This ensures nearby profiles queries use fresh location data
      clearLocationCache();
      
      // Invalidate nearby profiles queries to reflect privacy change
      queryClient.invalidateQueries({ queryKey: ['profiles', 'nearby'] });
    },
  });

  return {
    setLocationVisible: (visible: boolean) => updateLocationPrivacyMutation.mutate(visible),
    isLocationVisible: user?.location_visible !== false, // Default to true if not set
    isUpdating: updateLocationPrivacyMutation.isPending,
  };
}

