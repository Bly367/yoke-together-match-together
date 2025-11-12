import { UserProfile } from '@/services/auth.service';

export interface ProfileCompleteness {
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  suggestions: string[];
}

/**
 * Calculate profile completeness percentage
 * @param profile - User profile object
 * @returns Completeness object with percentage and suggestions
 */
export function calculateProfileCompleteness(profile: UserProfile | null | undefined): ProfileCompleteness {
  if (!profile) {
    return {
      percentage: 0,
      completedFields: [],
      missingFields: ['name', 'age', 'bio', 'photo_url'],
      suggestions: ['Add your name', 'Add your age', 'Add a bio', 'Upload a photo'],
    };
  }

  const fields = {
    name: { value: profile.name, weight: 20, suggestion: 'Add your name' },
    age: { value: profile.age, weight: 15, suggestion: 'Add your age' },
    bio: { value: profile.bio, weight: 25, suggestion: 'Add a bio to tell others about yourself' },
    photo_url: { value: profile.photo_url, weight: 40, suggestion: 'Upload a profile photo' },
  };

  const completedFields: string[] = [];
  const missingFields: string[] = [];
  const suggestions: string[] = [];
  let totalWeight = 0;
  let completedWeight = 0;

  for (const [fieldName, field] of Object.entries(fields)) {
    totalWeight += field.weight;
    
    const hasValue = field.value !== null && 
                     field.value !== undefined && 
                     field.value !== '' &&
                     (typeof field.value !== 'string' || field.value.trim().length > 0);

    if (hasValue) {
      completedFields.push(fieldName);
      completedWeight += field.weight;
    } else {
      missingFields.push(fieldName);
      suggestions.push(field.suggestion);
    }
  }

  const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  return {
    percentage,
    completedFields,
    missingFields,
    suggestions,
  };
}

/**
 * Get profile completeness color based on percentage
 */
export function getCompletenessColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-500';
  if (percentage >= 60) return 'text-yellow-500';
  if (percentage >= 40) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * Get profile completeness badge variant
 */
export function getCompletenessVariant(percentage: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (percentage >= 80) return 'default';
  if (percentage >= 60) return 'secondary';
  if (percentage >= 40) return 'outline';
  return 'destructive';
}

