import { z } from 'zod';

/**
 * Login Form Validation Schema
 * - Email: Valid email format
 * - Password: Minimum 6 characters (Supabase requirement)
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Sign Up Form Validation Schema
 * - Display Name: 2-50 characters
 * - Email: Valid email format
 * - Password: Minimum 8 characters with complexity requirements
 * - Confirm Password: Must match password
 */
export const signUpSchema = z
  .object({
    displayName: z
      .string()
      .min(1, 'Display name is required')
      .min(2, 'Display name must be at least 2 characters')
      .max(50, 'Display name must be less than 50 characters')
      .regex(
        /^[a-zA-Z0-9\s]+$/,
        'Display name can only contain letters, numbers, and spaces'
      ),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
