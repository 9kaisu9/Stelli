/**
 * Database types generated from Supabase
 *
 * To regenerate:
 * npx supabase gen types typescript --project-id <project-id> --schema public > lib/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          subscription_tier: 'free' | 'premium'
          subscription_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium'
          subscription_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          subscription_tier?: 'free' | 'premium'
          subscription_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          icon: string | null
          rating_type: 'stars' | 'points' | 'scale'
          rating_config: Json
          field_definitions: Json
          is_template: boolean
          template_category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          icon?: string | null
          rating_type: 'stars' | 'points' | 'scale'
          rating_config?: Json
          field_definitions: Json
          is_template?: boolean
          template_category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          icon?: string | null
          rating_type?: 'stars' | 'points' | 'scale'
          rating_config?: Json
          field_definitions?: Json
          is_template?: boolean
          template_category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      entries: {
        Row: {
          id: string
          list_id: string
          user_id: string
          rating: number | null
          field_values: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          list_id: string
          user_id: string
          rating?: number | null
          field_values: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          user_id?: string
          rating?: number | null
          field_values?: Json
          created_at?: string
          updated_at?: string
        }
      }
      shared_lists: {
        Row: {
          id: string
          list_id: string
          shared_by_user_id: string
          permission_type: 'view' | 'edit'
          share_token: string
          created_at: string
        }
        Insert: {
          id?: string
          list_id: string
          shared_by_user_id: string
          permission_type: 'view' | 'edit'
          share_token: string
          created_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          shared_by_user_id?: string
          permission_type?: 'view' | 'edit'
          share_token?: string
          created_at?: string
        }
      }
      list_imports: {
        Row: {
          id: string
          original_list_id: string
          imported_by_user_id: string
          new_list_id: string
          created_at: string
        }
        Insert: {
          id?: string
          original_list_id: string
          imported_by_user_id: string
          new_list_id: string
          created_at?: string
        }
        Update: {
          id?: string
          original_list_id?: string
          imported_by_user_id?: string
          new_list_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
