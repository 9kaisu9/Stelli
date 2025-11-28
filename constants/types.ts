/**
 * Common TypeScript types used throughout the Stelli app
 */

// ============================================================================
// DATA MODELS
// ============================================================================

// User Profile
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: 'free' | 'premium';
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// Field Types
export type FieldType = 'text' | 'number' | 'date' | 'dropdown' | 'multi-select' | 'yes-no' | 'rating';

export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // for dropdown/multi-select
  ratingConfig?: {
    max: number;
    step: number;
  }; // for rating fields
  order: number;
}

// List
export interface List {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rating_type: 'stars' | 'points' | 'scale';
  rating_config: {
    max: number;
    step?: number;
  };
  field_definitions: FieldDefinition[];
  is_template: boolean;
  template_category: string | null;
  created_at: string;
  updated_at: string;
}

// Entry
export interface Entry {
  id: string;
  list_id: string;
  user_id: string;
  rating: number | null;
  field_values: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Shared List
export interface SharedList {
  id: string;
  list_id: string;
  shared_by_user_id: string;
  permission_type: 'view' | 'edit';
  share_token: string;
  created_at: string;
}

// List Subscription (replaces ListImport)
export interface ListSubscription {
  id: string;
  list_id: string;
  user_id: string;
  permission_type: 'view' | 'edit';
  subscribed_at: string;
}

// For displaying recent entries with list info
export interface RecentEntryWithList extends Entry {
  list: {
    name: string;
    icon: string | null;
    rating_type: 'stars' | 'points' | 'scale';
    rating_config?: {
      max: number;
      step?: number;
    };
  };
}

// Legacy types (keeping for backwards compatibility with existing components)
export interface RecentEntry {
  id: string;
  name: string;
  icon: string;
  rating: number;        // 0-5, supports decimals (e.g., 4.5 for half star)
  date: string;          // Format: DD.MM.YYYY
}

export interface ListItem {
  id: string;
  name: string;
  icon: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
  size?: 'standard' | 'small';
  disabled?: boolean;
}

export interface IconButtonProps {
  onPress: () => void;
  icon: string;
  size?: number;
  backgroundColor?: string;
}

export interface ListItemProps {
  id: string;
  name: string;
  icon: string;
  onPress: () => void;
  showArrow?: boolean;
}

export interface RecentEntryItemProps {
  entry: RecentEntry;
  onPress: () => void;
}

export interface TabSwitcherProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export interface StarRatingProps {
  rating: number;        // 0-5
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
}

// ============================================================================
// NAVIGATION
// ============================================================================

export type RootStackParamList = {
  index: undefined;
  '(authenticated)/home': undefined;
  '(authenticated)/list/[id]': { id: string };
  '(authenticated)/entry/[id]': { id: string };
  '(authenticated)/add-entry/[listId]': { listId: string };
  '(authenticated)/edit-entry/[id]': { id: string };
  '(authenticated)/create-list': { template?: List };
  '(authenticated)/edit-list/[id]': { id: string };
  '(authenticated)/templates': undefined;
  '(authenticated)/profile': undefined;
  '(authenticated)/subscription': undefined;
};

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface EntryFormData {
  name: string;
  rating: number;
  notes?: string;
  listId: string;
  date: Date;
}
