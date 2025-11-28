import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Entry, List } from '@/constants/types';

export interface RecentEntryWithList extends Entry {
  list: List;
}

/**
 * Hook to fetch the most recent entries across all user lists
 * @param userId - The user ID to fetch entries for
 * @param limit - Maximum number of recent entries to fetch (default: 3)
 */
export function useRecentEntries(userId: string | undefined, limit: number = 3) {
  return useQuery({
    queryKey: ['recentEntries', userId, limit],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      // Fetch recent entries with their list information
      const { data: entries, error } = await supabase
        .from('entries')
        .select(`
          *,
          list:lists (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (entries || []) as RecentEntryWithList[];
    },
    enabled: !!userId,
  });
}
