import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Entry } from '@/constants/types';

/**
 * Hook to fetch all entries for a specific list
 */
export function useListEntries(listId: string | undefined) {
  return useQuery({
    queryKey: ['listEntries', listId],
    queryFn: async () => {
      if (!listId) throw new Error('List ID is required');

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('list_id', listId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Entry[];
    },
    enabled: !!listId,
  });
}

/**
 * Hook to fetch a single list with its details
 */
export function useListDetail(listId: string | undefined) {
  return useQuery({
    queryKey: ['listDetail', listId],
    queryFn: async () => {
      if (!listId) throw new Error('List ID is required');

      const { data, error } = await supabase
        .from('lists')
        .select('*')
        .eq('id', listId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!listId,
  });
}
