import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility functions
 */

/**
 * Combines class names using clsx and tailwind-merge
 * This is the standard utility function used by shadcn/ui components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format timestamp to relative time
 */
export function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  } catch {
    return 'just now';
  }
}

/**
 * Format timestamp to time string
 */
export function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Format timestamp to date string
 */
export function formatDate(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

/**
 * Crop an image based on crop area from react-easy-crop
 * @param imageSrc - Source image URL or data URL
 * @param pixelCrop - Crop area in pixels {x, y, width, height}
 * @param rotation - Rotation angle in degrees (default: 0)
 * @returns Promise resolving to cropped image as Blob
 */
export async function createCroppedImage(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation: number = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelCropScaled = {
    x: pixelCrop.x * scaleX,
    y: pixelCrop.y * scaleY,
    width: pixelCrop.width * scaleX,
    height: pixelCrop.height * scaleY,
  };

  // Set canvas size to crop size
  canvas.width = pixelCropScaled.width;
  canvas.height = pixelCropScaled.height;

  // Apply rotation if needed
  if (rotation !== 0) {
    const maxSize = Math.max(image.naturalWidth, image.naturalHeight);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
    
    canvas.width = safeArea;
    canvas.height = safeArea;
    
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);
    
    ctx.drawImage(
      image,
      safeArea / 2 - image.naturalWidth * 0.5,
      safeArea / 2 - image.naturalHeight * 0.5
    );
    
    const data = ctx.getImageData(0, 0, safeArea, safeArea);
    canvas.width = pixelCropScaled.width;
    canvas.height = pixelCropScaled.height;
    
    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.naturalWidth * 0.5 - pixelCropScaled.x),
      Math.round(0 - safeArea / 2 + image.naturalHeight * 0.5 - pixelCropScaled.y)
    );
  } else {
    // No rotation, simple crop
    ctx.drawImage(
      image,
      pixelCropScaled.x,
      pixelCropScaled.y,
      pixelCropScaled.width,
      pixelCropScaled.height,
      0,
      0,
      pixelCropScaled.width,
      pixelCropScaled.height
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create blob from canvas'));
        return;
      }
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

/**
 * Create an Image object from a source URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param initialDelay - Initial delay in milliseconds
 * @returns Promise resolving to the function result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 5,
  initialDelay: number = 100
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        // Don't retry on validation errors or auth errors
        if (error.message.includes('validation') || 
            error.message.includes('authentication') ||
            error.message.includes('permission')) {
          throw error;
        }
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        throw lastError;
      }
      
      // Exponential backoff: delay = initialDelay * 2^attempt
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Validate email address format
 * @param email - Email address to validate
 * @returns True if email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.trim().length === 0) return false;
  
  // RFC 5322 compliant regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Additional checks
  if (email.length > 254) return false; // RFC 5321 limit
  if (email.startsWith('.') || email.endsWith('.')) return false;
  if (email.includes('..')) return false;
  
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return false;
  if (localPart.length > 64) return false; // RFC 5321 limit
  if (domain.length > 253) return false; // RFC 5321 limit
  
  return true;
}

/**
 * Calculate password strength score (0-4)
 * @param password - Password to evaluate
 * @returns Strength score: 0=very weak, 1=weak, 2=fair, 3=good, 4=strong
 */
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string;
} {
  if (!password) {
    return { score: 0, feedback: '' };
  }
  
  let score = 0;
  const feedback: string[] = [];
  
  // Length check
  if (password.length >= 8) score++;
  else feedback.push('At least 8 characters');
  
  if (password.length >= 12) score++;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  else feedback.push('lowercase letter');
  
  if (/[A-Z]/.test(password)) score++;
  else feedback.push('uppercase letter');
  
  if (/[0-9]/.test(password)) score++;
  else feedback.push('number');
  
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('special character');
  
  // Cap at 4
  score = Math.min(score, 4);
  
  // Generate feedback message
  let feedbackMessage = '';
  if (score === 0) feedbackMessage = 'Very weak';
  else if (score === 1) feedbackMessage = 'Weak';
  else if (score === 2) feedbackMessage = 'Fair';
  else if (score === 3) feedbackMessage = 'Good';
  else if (score === 4) feedbackMessage = 'Strong';
  
  if (feedback.length > 0 && score < 4) {
    feedbackMessage += ` - Add ${feedback.slice(0, 2).join(' and ')}`;
  }
  
  return { score, feedback: feedbackMessage };
}

/**
 * Match-related utility types
 */
export interface MatchWithDuos {
  duo1_id: string;
  duo2_id: string;
  duo1?: {
    id: string;
    member1?: { id: string; name: string; photo_url?: string };
    member2?: { id: string; name: string; photo_url?: string };
  };
  duo2?: {
    id: string;
    member1?: { id: string; name: string; photo_url?: string };
    member2?: { id: string; name: string; photo_url?: string };
  };
}

/**
 * Get the other duo from a match (the one that's not the user's duo)
 * @param match - The match object
 * @param userDuoIdsSet - Set of user's duo IDs for O(1) lookup
 * @returns The other duo or null if not found
 */
export function getOtherDuo(
  match: MatchWithDuos,
  userDuoIdsSet: Set<string>
): MatchWithDuos['duo1'] | MatchWithDuos['duo2'] | null {
  if (!match.duo1 || !match.duo2 || userDuoIdsSet.size === 0) return null;
  
  // Find which duo is the user's duo using Set for O(1) lookup
  const isDuo1UserDuo = userDuoIdsSet.has(match.duo1_id);
  const isDuo2UserDuo = userDuoIdsSet.has(match.duo2_id);
  
  // Return the duo that's NOT the user's duo
  if (isDuo1UserDuo) return match.duo2;
  if (isDuo2UserDuo) return match.duo1;
  
  // Fallback to duo2 if we can't determine
  return match.duo2;
}

/**
 * Get the display name for a match
 * @param match - The match object
 * @param userDuoIdsSet - Set of user's duo IDs for O(1) lookup
 * @returns The display name for the match
 */
export function getMatchName(
  match: MatchWithDuos,
  userDuoIdsSet: Set<string>
): string {
  const otherDuo = getOtherDuo(match, userDuoIdsSet);
  if (!otherDuo || !otherDuo.member1 || !otherDuo.member2) return 'Unknown Duo';
  return `${otherDuo.member1.name} & ${otherDuo.member2.name}`;
}

/**
 * Parse and normalize interests string
 * @param interestsString - Comma-separated interests string
 * @returns Array of normalized, deduplicated interests
 */
export function parseInterests(interestsString: string): string[] {
  if (!interestsString || interestsString.trim().length === 0) return [];
  
  return interestsString
    .split(',')
    .map(i => i.trim().toLowerCase())
    .filter(i => i.length > 0)
    .filter((value, index, self) => self.indexOf(value) === index) // Deduplicate
    .map(i => i.charAt(0).toUpperCase() + i.slice(1)); // Capitalize first letter
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extract coordinates from PostGIS POINT format or GeoJSON
 * @param point - PostGIS POINT string or GeoJSON object
 * @returns Object with latitude and longitude, or null if invalid
 */
export function extractCoordinatesFromPoint(point: any): { latitude: number; longitude: number } | null {
  if (!point) return null;

  // GeoJSON format: { coordinates: [longitude, latitude] }
  if (typeof point === 'object' && 'coordinates' in point) {
    const [lng, lat] = point.coordinates;
    if (typeof lng === 'number' && typeof lat === 'number') {
      return { longitude: lng, latitude: lat };
    }
  }

  // PostGIS string format: "POINT(lng lat)" or "SRID=4326;POINT(lng lat)"
  if (typeof point === 'string') {
    const pointStr = point.includes('POINT') 
      ? point.split('POINT')[1] 
      : point;
    
    const match = pointStr.match(/\(([^)]+)\)/);
    if (match) {
      const coords = match[1].trim().split(/\s+/);
      if (coords.length >= 2) {
        const lng = parseFloat(coords[0]);
        const lat = parseFloat(coords[1]);
        if (!isNaN(lng) && !isNaN(lat)) {
          return { longitude: lng, latitude: lat };
        }
      }
    }
  }

  return null;
}
