import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Entry, FieldDefinition } from '@/constants/types';
import { uploadFile } from '@/lib/utils/uploadFile';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

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

  // Helper function to upload a file to Supabase Storage
  const uploadFileToStorage = async (uri: string, userId: string): Promise<string> => {
    if (!uri.startsWith('file://')) {
      // Not a local file, probably already a public URL
      return uri;
    }

    const fileExt = uri.split('.').pop()?.toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

      if (!base64) {
        throw new Error('Failed to read file as base64: empty content.');
      }
      const arraybuffer = decode(base64);

      const { data, error } = await supabase.storage
        .from('entry-photos')
        .upload(filePath, arraybuffer, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Supabase storage upload failed: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from('entry-photos').getPublicUrl(filePath);
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL after upload.');
      }
      return publicUrlData.publicUrl;

    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw new Error(`File upload failed: ${error.message || 'Unknown error'}`);
    }
  };

  const updateEntryMutation = useMutation({
    mutationFn: async ({
      entryId,
      updates,
      userId,
      fieldDefinitions
    }: {
      entryId: string;
      updates: Partial<Entry>;
      userId?: string;
      fieldDefinitions?: FieldDefinition[];
    }) => {
      const processedUpdates = { ...updates };

      // Handle file uploads for photo fields if fieldDefinitions provided
      if (userId && fieldDefinitions && processedUpdates.field_values) {
        const processedFieldValues = { ...processedUpdates.field_values };

        for (const field of fieldDefinitions) {
          if (field.type === 'photos' && processedFieldValues[field.id]) {
            const imageUris = processedFieldValues[field.id] as string[];
            const uploadedUrls = await Promise.all(
              imageUris.map(uri => uploadFileToStorage(uri, userId))
            );
            processedFieldValues[field.id] = uploadedUrls;
          }
        }

        processedUpdates.field_values = processedFieldValues;
      }

      // Handle main image upload
      if (userId && processedUpdates.main_image_url && processedUpdates.main_image_url.startsWith('file://')) {
        processedUpdates.main_image_url = await uploadFileToStorage(processedUpdates.main_image_url, userId);
      }

      const { data, error } = await supabase
        .from('entries')
        .update({
          ...processedUpdates,
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
