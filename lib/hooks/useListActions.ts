import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/contexts/AuthContext';
import { trackEvent } from '@/lib/posthog';
import { List, FieldDefinition } from '@/constants/types';

export interface CreateListData {
  name: string;
  description?: string;
  icon?: string;
  rating_type: 'stars' | 'points' | 'scale';
  rating_config?: {
    max: number;
    step: number;
  };
  field_definitions?: FieldDefinition[];
}

export interface UpdateListData extends Partial<CreateListData> {
  id: string;
}

/**
 * Hook for list CRUD operations
 */
export function useListActions() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  /**
   * Create a new list
   * Checks free tier limits before creating
   */
  const createListMutation = useMutation({
    mutationFn: async (newList: CreateListData) => {
      if (!user) throw new Error('User not authenticated');

      // TEMP: Disable free tier limit for testing (remove this later)
      // Check free tier limit (1 list maximum)
      // if (profile?.subscription_tier === 'free') {
      //   const { count, error: countError } = await supabase
      //     .from('lists')
      //     .select('*', { count: 'exact', head: true })
      //     .eq('user_id', user.id);

      //   if (countError) throw countError;

      //   if ((count || 0) >= 1) {
      //     throw new Error('FREE_TIER_LIMIT');
      //   }
      // }

      // Create the list
      const { data, error } = await supabase
        .from('lists')
        .insert({
          user_id: user.id,
          name: newList.name,
          description: newList.description || null,
          icon: newList.icon || null,
          rating_type: newList.rating_type,
          rating_config: newList.rating_config || { max: 5, step: 1 },
          field_definitions: newList.field_definitions || [],
          is_template: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as List;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      trackEvent('List Created', {
        listName: data.name,
        ratingType: data.rating_type,
        fieldCount: data.field_definitions?.length || 0,
      });
    },
    onError: (error: any) => {
      if (error.message === 'FREE_TIER_LIMIT') {
        trackEvent('Free Tier Limit Reached', { feature: 'list_creation' });
      }
    },
  });

  /**
   * Update an existing list
   */
  const updateListMutation = useMutation({
    mutationFn: async (updatedList: UpdateListData) => {
      if (!user) throw new Error('User not authenticated');

      const { id, ...updateData } = updatedList;

      const { data, error } = await supabase
        .from('lists')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user owns the list
        .select()
        .single();

      if (error) throw error;
      return data as List;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['list', data.id] });
      trackEvent('List Updated', { listId: data.id });
    },
  });

  /**
   * Delete a list and all its entries
   */
  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Delete all entries first (cascade delete is handled by database)
      // But we do it manually for better control
      const { error: entriesError } = await supabase
        .from('entries')
        .delete()
        .eq('list_id', listId);

      if (entriesError) throw entriesError;

      // Delete the list
      const { error: listError } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', user.id); // Ensure user owns the list

      if (listError) throw listError;
    },
    onSuccess: (_, listId) => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.removeQueries({ queryKey: ['list', listId] });
      queryClient.removeQueries({ queryKey: ['entries', listId] });
      trackEvent('List Deleted', { listId });
    },
  });

  return {
    createListMutation,
    updateListMutation,
    deleteListMutation,
  };
}
