import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Database } from './database.types';

// Environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage adapter for Expo SecureStore with chunking for large values
// SecureStore has a 2048 byte limit, so we split large values into chunks
const CHUNK_SIZE = 2000; // Leave some buffer under the 2048 limit

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      // Try to get the first chunk
      const firstChunk = await SecureStore.getItemAsync(key);
      if (!firstChunk) return null;

      // Check if this is a chunked value
      const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
      if (!chunkCount) {
        // Not chunked, return as-is
        return firstChunk;
      }

      // Reassemble chunks
      const chunks = [firstChunk];
      const totalChunks = parseInt(chunkCount, 10);
      for (let i = 1; i < totalChunks; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
        if (chunk) chunks.push(chunk);
      }
      return chunks.join('');
    } catch (error) {
      console.error('Error getting item from SecureStore:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      // If value is small enough, store directly
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        // Clean up any existing chunks
        await SecureStore.deleteItemAsync(`${key}_chunks`);
        return;
      }

      // Split into chunks
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      // Store each chunk
      for (let i = 0; i < chunks.length; i++) {
        await SecureStore.setItemAsync(i === 0 ? key : `${key}_${i}`, chunks[i]);
      }

      // Store chunk count
      await SecureStore.setItemAsync(`${key}_chunks`, chunks.length.toString());
    } catch (error) {
      console.error('Error setting item in SecureStore:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      // Check if chunked
      const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunkCount) {
        const totalChunks = parseInt(chunkCount, 10);
        for (let i = 1; i < totalChunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_chunks`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from SecureStore:', error);
    }
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
