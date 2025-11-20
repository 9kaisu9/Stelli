import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { List } from '@/constants/types';

/**
 * Fetch all lists for a user with entry counts
 * Lists are ordered by most recently updated first
 */
export function useUserLists(userId: string | undefined) {
  return useQuery({
    queryKey: ['lists', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      // Fetch all lists for the user
      const { data: lists, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (listsError) throw listsError;

      // For each list, fetch the entry count
      const listsWithCounts = await Promise.all(
        (lists || []).map(async (list) => {
          const { count, error: countError } = await supabase
            .from('entries')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);

          // If count fails, default to 0
          return {
            ...list,
            entry_count: countError ? 0 : (count || 0),
          };
        })
      );

      return listsWithCounts as (List & { entry_count: number })[];
    },
    enabled: !!userId,
  });
}

/**
 * Get the count of lists for a user (for free tier checking)
 */
export function useListCount(userId: string | undefined) {
  return useQuery({
    queryKey: ['lists', userId, 'count'],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      const { count, error } = await supabase
        .from('lists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });
}
