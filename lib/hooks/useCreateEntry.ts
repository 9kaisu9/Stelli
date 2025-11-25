import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Entry } from '@/constants/types';

interface CreateEntryData {
  list_id: string;
  user_id: string;
  rating: number | null;
  field_values: Record<string, any>;
}

/**
 * Hook for creating new entries
 */
export function useCreateEntry() {
  const queryClient = useQueryClient();

  const createEntryMutation = useMutation({
    mutationFn: async (data: CreateEntryData) => {
      const { data: newEntry, error } = await supabase
        .from('entries')
        .insert({
          list_id: data.list_id,
          user_id: data.user_id,
          rating: data.rating,
          field_values: data.field_values,
        })
        .select()
        .single();

      if (error) throw error;
      return newEntry as Entry;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['listEntries', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['recentEntries'] });
    },
  });

  return {
    createEntryMutation,
  };
}
