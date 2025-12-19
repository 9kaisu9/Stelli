import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Entry, FieldDefinition } from '@/constants/types';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

interface CreateEntryData {
  list_id: string;
  user_id: string;
  rating: number | null;
  field_values: Record<string, any>;
  fieldDefinitions: FieldDefinition[];
}

/**
 * Hook for creating new entries
 */
export function useCreateEntry() {
  const queryClient = useQueryClient();

  // Helper function to upload a file to Supabase Storage
  const uploadFile = async (uri: string, userId: string): Promise<string> => {
    if (!uri.startsWith('file://')) {
      // Not a local file, probably already a public URL or base64 data
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
      console.log('Base64 string length:', base64.length); // Add this for debugging
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

  const createEntryMutation = useMutation({
    mutationFn: async (data: CreateEntryData) => {
      // 1. Handle file uploads for 'photos' fields
      const processedFieldValues = { ...data.field_values };

      for (const field of data.fieldDefinitions) {
        if (field.type === 'photos' && processedFieldValues[field.id]) {
          const imageUris = processedFieldValues[field.id] as string[];
          const uploadedUrls = await Promise.all(
            imageUris.map(uri => uploadFile(uri, data.user_id))
          );
          processedFieldValues[field.id] = uploadedUrls;
        }
      }

      // 2. Create the entry with the processed field values
      const { data: newEntry, error } = await supabase
        .from('entries')
        .insert({
          list_id: data.list_id,
          user_id: data.user_id,
          rating: data.rating,
          field_values: processedFieldValues,
        })
        .select()
        .single();

      if (error) throw error;
      return newEntry as Entry;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['listEntries', data.list_id] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['recentEntries'] });
    },
  });

  return {
    createEntryMutation,
  };
}
