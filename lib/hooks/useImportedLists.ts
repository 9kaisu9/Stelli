import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';

export function useSubscribedLists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscribedLists', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch lists that this user has subscribed to
      const { data, error } = await supabase
        .from('list_subscriptions')
        .select(`
          id,
          subscribed_at,
          permission_type,
          list_id,
          lists (
            id,
            name,
            description,
            icon,
            rating_type,
            user_id,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .order('subscribed_at', { ascending: false });

      if (error) throw error;

      // Fetch owner display names for referenced lists
      const ownerIds = Array.from(
        new Set(
          (data || [])
            .map((subscription) => subscription.lists?.user_id)
            .filter(Boolean)
        )
      );

      let ownerDisplayNames: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: owners, error: ownersError } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ownerIds);

        if (!ownersError && owners) {
          ownerDisplayNames = owners.reduce<Record<string, string>>((acc, owner) => {
            acc[owner.id] = owner.display_name || 'Unknown';
            return acc;
          }, {});
        }
      }

      // Transform the data to include entry count
      const listsWithCounts = await Promise.all(
        (data || []).map(async (subscription) => {
          const list = subscription.lists;

          // Get entry count for this list
          const { count } = await supabase
            .from('entries')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          return {
            ...list,
            entry_count: count || 0,
            subscribed_at: subscription.subscribed_at,
            permission_type: subscription.permission_type,
            is_owner: false, // This is a subscribed list, not owned by the user
            owner_display_name: (list.user_id && ownerDisplayNames[list.user_id]) || 'Unknown',
          };
        })
      );

      return listsWithCounts;
    },
    enabled: !!user,
  });
}

// Backwards compatibility alias
export const useImportedLists = useSubscribedLists;
