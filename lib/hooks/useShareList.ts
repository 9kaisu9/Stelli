import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Generate a random token for sharing
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function useShareList(listId: string) {
  const queryClient = useQueryClient();

  // Fetch existing share links for this list
  const { data: shareLinks } = useQuery({
    queryKey: ['shareLinks', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_lists')
        .select('*')
        .eq('list_id', listId);

      if (error) throw error;
      return data;
    },
  });

  // Create or get existing share link
  const createShareLinkMutation = useMutation({
    mutationFn: async (permissionType: 'view' | 'edit') => {
      // Check if a share link with this permission already exists
      const existingLink = shareLinks?.find(
        (link) => link.permission_type === permissionType
      );

      if (existingLink) {
        // Return existing link
        return existingLink.share_token;
      }

      // Create new share link
      const shareToken = generateShareToken();
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shared_lists')
        .insert({
          list_id: listId,
          shared_by_user_id: userData.user.id,
          permission_type: permissionType,
          share_token: shareToken,
        })
        .select()
        .single();

      if (error) throw error;
      return data.share_token;
    },
    onSuccess: () => {
      // Invalidate share links query to refetch
      queryClient.invalidateQueries({ queryKey: ['shareLinks', listId] });
    },
  });

  // Generate shareable URL
  const generateShareUrl = async (permissionType: 'view' | 'edit'): Promise<string> => {
    const shareToken = await createShareLinkMutation.mutateAsync(permissionType);

    // Use deep link format that will open the app
    // Format: stelli://shared/[token]
    // This will work with Expo Go and built apps
    return `stelli://shared/${shareToken}`;
  };

  // Delete share link
  const deleteShareLinkMutation = useMutation({
    mutationFn: async (shareToken: string) => {
      const { error } = await supabase
        .from('shared_lists')
        .delete()
        .eq('share_token', shareToken);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shareLinks', listId] });
    },
  });

  return {
    shareLinks,
    generateShareUrl,
    deleteShareLink: deleteShareLinkMutation.mutate,
    isGenerating: createShareLinkMutation.isPending,
    isDeleting: deleteShareLinkMutation.isPending,
  };
}

// Hook to fetch shared list by token
export function useSharedList(shareToken: string) {
  return useQuery({
    queryKey: ['sharedList', shareToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_lists')
        .select(`
          *,
          lists (*),
          shared_by_profile:profiles!shared_by_user_id (display_name, id)
        `)
        .eq('share_token', shareToken)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!shareToken,
  });
}
