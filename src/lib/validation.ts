/**
 * Validation schemas using Zod
 * 
 * Provides type-safe validation for all user inputs.
 * Used in both UI and service layers for consistent validation.
 * 
 * @example
 * ```typescript
 * import { emailSchema, passwordSchema } from '@/lib/validation';
 * 
 * // Validate in service
 * emailSchema.parse(email);
 * passwordSchema.parse(password);
 * 
 * // Or use safeParse for error handling
 * const result = emailSchema.safeParse(email);
 * if (!result.success) {
 *   throw new ValidationError(result.error.errors[0].message, 'email');
 * }
 * ```
 */

import { z } from 'zod';
import { ValidationError } from './errors';

/**
 * Email validation schema
 * Validates email format
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .trim();

/**
 * Password validation schema
 * Enforces strong password requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Name validation schema
 * Validates user names
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .trim()
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

/**
 * Age validation schema
 * Validates age (must be 18+)
 */
export const ageSchema = z
  .number()
  .int('Age must be a whole number')
  .min(18, 'Must be at least 18 years old')
  .max(120, 'Invalid age');

/**
 * User ID validation schema (UUID)
 */
export const userIdSchema = z
  .string()
  .uuid('Invalid user ID format');

/**
 * Duo ID validation schema (UUID)
 */
export const duoIdSchema = z
  .string()
  .uuid('Invalid duo ID format');

/**
 * Match ID validation schema (UUID)
 */
export const matchIdSchema = z
  .string()
  .uuid('Invalid match ID format');

/**
 * Bio validation schema
 * Validates user bio text
 */
export const bioSchema = z
  .string()
  .max(500, 'Bio must be less than 500 characters')
  .trim()
  .optional()
  .nullable();

/**
 * Message content validation schema
 * Validates chat message content
 */
export const messageContentSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(1000, 'Message must be less than 1000 characters')
  .trim();

/**
 * Interest validation schema
 * Validates individual interest strings
 */
export const interestSchema = z
  .string()
  .min(1, 'Interest cannot be empty')
  .max(50, 'Interest must be less than 50 characters')
  .trim();

/**
 * Interests array validation schema
 * Validates array of interests (max 20)
 */
export const interestsSchema = z
  .array(interestSchema)
  .max(20, 'Maximum 20 interests allowed')
  .optional();

/**
 * URL validation schema
 * Validates URLs (for photos, attachments, etc.)
 */
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL must be less than 2048 characters');

/**
 * Latitude validation schema
 * Validates latitude coordinates (-90 to 90)
 */
export const latitudeSchema = z
  .number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

/**
 * Longitude validation schema
 * Validates longitude coordinates (-180 to 180)
 */
export const longitudeSchema = z
  .number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

/**
 * Gender validation schema
 */
export const genderSchema = z.enum(['man', 'woman', 'non-binary', 'prefer-not-to-say']);

/**
 * Preference validation schema (who user wants to match with)
 */
export const preferenceSchema = z.enum(['men', 'women', 'both']);

/**
 * Swipe action validation schema
 */
export const swipeActionSchema = z.enum(['like', 'pass']);

/**
 * Helper function to validate and throw ValidationError on failure
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param field - Optional field name for better error context
 * @returns Validated data of type T
 * @throws {ValidationError} If validation fails
 * 
 * @example
 * ```typescript
 * try {
 *   const email = validateOrThrow(emailSchema, userInput, 'email');
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error('Validation failed:', error.field, error.message);
 *   }
 * }
 * ```
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, field?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = result.error.errors[0];
    throw new ValidationError(error.message, field);
  }
  return result.data;
}

