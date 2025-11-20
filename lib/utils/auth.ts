import { supabase } from '../supabase';
import { AuthError } from '@supabase/supabase-js';

/**
 * Maps Supabase auth errors to user-friendly messages
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred';

  // Handle Supabase AuthError
  if (error instanceof Error) {
    const authError = error as AuthError;

    // Check for common error messages
    const message = authError.message.toLowerCase();

    if (message.includes('invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (message.includes('email not confirmed')) {
      return 'Please verify your email address before logging in';
    }
    if (message.includes('user already registered')) {
      return 'An account with this email already exists';
    }
    if (message.includes('email rate limit exceeded')) {
      return 'Too many attempts. Please try again later';
    }
    if (message.includes('invalid email')) {
      return 'Please enter a valid email address';
    }
    if (message.includes('password should be at least')) {
      return 'Password must be at least 6 characters';
    }
    if (message.includes('network')) {
      return 'Network error. Please check your connection';
    }

    // Return the original message if no match found
    return authError.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Sign in with email and password
 * @throws Error with user-friendly message
 */
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

/**
 * Sign up with email, password, and create profile
 * Creates both auth user and profile record in database
 * @throws Error with user-friendly message
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // Profile is automatically created by database trigger (on_auth_user_created)
    // The trigger reads display_name from user metadata and creates the profile

    return authData;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

/**
 * Sign out current user
 * @throws Error with user-friendly message
 */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

/**
 * Reset password - sends email with reset link
 * @throws Error with user-friendly message
 */
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: 'myapp://reset-password', // Deep link for password reset
      }
    );

    if (error) throw error;
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}
