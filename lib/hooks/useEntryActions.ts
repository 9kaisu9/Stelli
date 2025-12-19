import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Entry, FieldDefinition } from '@/constants/types';
import { uploadFile } from '@/lib/utils/uploadFile';

/**
 * Hook to fetch a single entry by ID
 */
export function useEntry(entryId: string | undefined) {
  return useQuery({
    queryKey: ['entry', entryId],
    queryFn: async () => {
      if (!entryId) throw new Error('Entry ID is required');

      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('id', entryId)
        .single();

      if (error) throw error;
      return data as Entry;
    },
    enabled: !!entryId,
  });
}

/**
 * Hook for entry mutations (update, delete)
 */
export function useEntryActions() {
  const queryClient = useQueryClient();

  const updateEntryMutation = useMutation({
    mutationFn: async ({ entryId, updates }: { entryId: string; updates: Partial<Entry> }) => {
      const { data, error } = await supabase
        .from('entries')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data as Entry;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['entry', data.id] });
      queryClient.invalidateQueries({ queryKey: ['listEntries', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['recentEntries'] });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      return entryId;
    },
    onSuccess: (_, entryId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['entry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['listEntries'] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['recentEntries'] });
      queryClient.invalidateQueries({ queryKey: ['allEntries'] });
    },
  });

  return {
    updateEntryMutation,
    deleteEntryMutation,
  };
}
