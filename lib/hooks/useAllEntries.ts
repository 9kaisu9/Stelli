import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Entry, List } from '@/constants/types';

export interface EntryWithList extends Entry {
  list: List;
}

/**
 * Hook to fetch all entries across all user lists
 * @param userId - The user ID to fetch entries for
 */
export function useAllEntries(userId: string | undefined) {
  return useQuery({
    queryKey: ['allEntries', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      // Fetch all entries with their list information
      const { data: entries, error } = await supabase
        .from('entries')
        .select(`
          *,
          list:lists (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (entries || []) as EntryWithList[];
    },
    enabled: !!userId,
  });
}
