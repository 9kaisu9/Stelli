import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * Hook to check user's permission level for a specific list
 * Returns: 'owner' | 'edit' | 'view' | null
 */
export function useListPermissions(listId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['listPermissions', listId, user?.id],
    queryFn: async () => {
      if (!user || !listId) return null;

      // First, check if user owns the list
      const { data: list, error: listError } = await supabase
        .from('lists')
        .select('user_id')
        .eq('id', listId)
        .single();

      if (listError) throw listError;

      // If user owns the list, they have full permissions
      if (list.user_id === user.id) {
        return 'owner';
      }

      // Otherwise, check if they have a subscription
      const { data: subscription, error: subscriptionError } = await supabase
        .from('list_subscriptions')
        .select('permission_type')
        .eq('list_id', listId)
        .eq('user_id', user.id)
        .single();

      // If no subscription found, user has no access
      if (subscriptionError || !subscription) {
        return null;
      }

      // Return the subscription permission type
      return subscription.permission_type;
    },
    enabled: !!user && !!listId,
  });
}

/**
 * Helper function to check if user can edit a list
 */
export function useCanEditList(listId: string | undefined) {
  const { data: permission } = useListPermissions(listId);
  return permission === 'owner' || permission === 'edit';
}

/**
 * Helper function to check if user can view a list
 */
export function useCanViewList(listId: string | undefined) {
  const { data: permission } = useListPermissions(listId);
  return permission !== null;
}

/**
 * Helper function to check if user owns a list
 */
export function useIsListOwner(listId: string | undefined) {
  const { data: permission } = useListPermissions(listId);
  return permission === 'owner';
}
