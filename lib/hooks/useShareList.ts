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
      console.log('🔗 Creating share link for list:', listId, 'permission:', permissionType);

      // Check if a share link with this permission already exists
      const existingLink = shareLinks?.find(
        (link) => link.permission_type === permissionType
      );

      if (existingLink) {
        // Return existing link
        console.log('✅ Found existing share link:', existingLink.share_token);
        return existingLink.share_token;
      }

      // Create new share link
      const shareToken = generateShareToken();
      console.log('🎲 Generated new token:', shareToken);
      console.log('📏 Token length:', shareToken.length);

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) throw new Error('Not authenticated');

      console.log('👤 User ID:', userData.user.id);

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

      if (error) {
        console.error('❌ Error creating share link:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        throw error;
      }

      console.log('✅ Created share link in database:', data);
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
      console.log('🔍 Looking up share token:', shareToken);
      console.log('📏 Token length:', shareToken?.length);

      // First, get the shared_lists record
      const { data: sharedListData, error: sharedListError } = await supabase
        .from('shared_lists')
        .select('*')
        .eq('share_token', shareToken)
        .single();

      if (sharedListError) {
        console.error('❌ Error fetching shared list:', sharedListError);
        throw sharedListError;
      }

      if (!sharedListData) {
        throw new Error('Shared list not found');
      }

      // Then, fetch the list details
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .select('*')
        .eq('id', sharedListData.list_id)
        .single();

      if (listError) {
        console.error('❌ Error fetching list:', listError);
        throw listError;
      }

      // Then, fetch the profile details
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, id')
        .eq('id', sharedListData.shared_by_user_id)
        .single();

      // Profile is optional, don't throw if it doesn't exist
      if (profileError) {
        console.warn('⚠️ Error fetching profile:', profileError);
      }

      // Combine the data
      const result = {
        ...sharedListData,
        lists: listData,
        profiles: profileData,
      };

      console.log('✅ Found shared list:', result);
      return result;
    },
    enabled: !!shareToken,
  });
}
