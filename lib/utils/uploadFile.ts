import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

/**
 * Uploads a file (image) to Supabase Storage and returns its public URL.
 * It handles local file URIs and checks if the URI is already a public URL.
 *
 * @param uri The local file URI (e.g., 'file:///data/user/0/...') or an existing public URL.
 * @param userId The ID of the user, used for creating a unique path in storage.
 * @returns The public URL of the uploaded file.
 * @throws {Error} If the upload fails or public URL cannot be retrieved.
 */
export const uploadFile = async (uri: string, userId: string): Promise<string> => {
  if (!uri.startsWith('file://')) {
    // Not a local file, probably already a public URL or base64 data.
    // We assume it's already uploaded or doesn't need to be.
    return uri;
  }

  const fileExt = uri.split('.').pop()?.toLowerCase();
  // Generate a more robust unique file name
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`; // Store in a user-specific folder

  try {
    // Read the file as a base64 string
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    // Convert base64 to ArrayBuffer for Supabase upload
    const arraybuffer = decode(base64);

    const { error: uploadError } = await supabase.storage
      .from('entry-photos') // Use your designated bucket name
      .upload(filePath, arraybuffer, {
        contentType: `image/${fileExt}`, // Set correct content type
        cacheControl: '3600', // Cache for 1 hour
        upsert: false, // Do not overwrite existing files with the same name
      });

    if (uploadError) {
      throw new Error(`Supabase storage upload failed: ${uploadError.message}`);
    }

    // Get the public URL of the uploaded file
    const { data: publicUrlData } = supabase.storage.from('entry-photos').getPublicUrl(filePath);
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL after upload.');
    }
    return publicUrlData.publicUrl;

  } catch (error: any) {
    console.error('Error in uploadFile utility:', error);
    throw new Error(`File upload failed: ${error.message || 'Unknown error'}`);
  }
};
