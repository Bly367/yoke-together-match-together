import type { Gender, Preference } from '@/services/auth.service';
import type { UserPreferences } from '@/services/preferences.service';
import type { DuoWithMembers } from '@/services/duo.service';
import { extractCoordinatesFromPoint, calculateDistance } from './utils';

/**
 * Profile with extended demographics
 */
export interface ProfileWithDemographics {
  id: string;
  age?: number;
  height_inches?: number;
  education_level?: string;
  religion?: string;
  political_views?: string;
  drinking_habit?: string;
  smoking_habit?: string;
  exercise_frequency?: string;
  relationship_goal?: string;
  has_kids?: string;
  wants_kids?: string;
  languages?: string[];
  ethnicity?: string;
  location?: string | { coordinates: [number, number] };
}

/**
 * Compatibility score breakdown
 */
export interface CompatibilityScore {
  total: number; // 0-100
  age: number;
  height: number;
  education: number;
  lifestyle: number;
  values: number;
  interests: number;
  distance: number;
  reasons: string[]; // Reasons why match appeared
}

/**
 * Check if a user's preference matches a gender
 * @param preference - User's preference (men, women, both)
 * @param gender - Gender to check against
 * @returns true if preference matches gender
 */
export function preferenceMatchesGender(preference: Preference | undefined, gender: Gender | undefined): boolean {
  if (!preference || !gender) return true; // Default to allowing if not set (backward compatibility)
  if (preference === 'both') return true;
  if (preference === 'men' && gender === 'man') return true;
  if (preference === 'women' && gender === 'woman') return true;
  return false;
}

/**
 * Check if two duos can match based on their members' preferences
 * 
 * Matching logic:
 * - At least one person in duo A must be interested in at least one person in duo B
 * - At least one person in duo B must be interested in at least one person in duo A
 * 
 * @param duoA - First duo with member profiles including gender and preference
 * @param duoB - Second duo with member profiles including gender and preference
 * @returns true if duos can match based on preferences
 */
export function canDuosMatch(
  duoA: {
    member1: { gender?: Gender; preference?: Preference };
    member2: { gender?: Gender; preference?: Preference };
  },
  duoB: {
    member1: { gender?: Gender; preference?: Preference };
    member2: { gender?: Gender; preference?: Preference };
  }
): boolean {
  // Get all preferences and genders
  const duoAPrefs = [duoA.member1.preference, duoA.member2.preference].filter(Boolean) as Preference[];
  const duoBPrefs = [duoB.member1.preference, duoB.member2.preference].filter(Boolean) as Preference[];
  const duoAGenders = [duoA.member1.gender, duoA.member2.gender].filter(Boolean) as Gender[];
  const duoBGenders = [duoB.member1.gender, duoB.member2.gender].filter(Boolean) as Gender[];

  // If no preferences set, allow match (backward compatibility)
  if (duoAPrefs.length === 0 && duoBPrefs.length === 0) return true;
  if (duoAGenders.length === 0 || duoBGenders.length === 0) return true;

  // Check if at least one person in duo A is interested in at least one person in duo B
  const duoAInterestedInDuoB = duoAPrefs.some(pref =>
    duoBGenders.some(gender => preferenceMatchesGender(pref, gender))
  );

  // Check if at least one person in duo B is interested in at least one person in duo A
  const duoBInterestedInDuoA = duoBPrefs.some(pref =>
    duoAGenders.some(gender => preferenceMatchesGender(pref, gender))
  );

  // Both conditions must be true for a match
  return duoAInterestedInDuoB && duoBInterestedInDuoA;
}

/**
 * Check if a user's preference matches any gender in a duo
 * @param userPreference - User's preference
 * @param duoGenders - Array of genders in the duo
 * @returns true if user's preference matches any gender in the duo
 */
export function userPreferenceMatchesDuo(
  userPreference: Preference | undefined,
  duoGenders: (Gender | undefined)[]
): boolean {
  if (!userPreference) return true; // Default to allowing if not set
  if (userPreference === 'both') return true;
  
  return duoGenders.some(gender => preferenceMatchesGender(userPreference, gender));
}

/**
 * Check if a profile matches age preference
 */
export function matchesAgePreference(
  age: number | undefined,
  minAge?: number,
  maxAge?: number
): boolean {
  if (age === undefined) return true; // Can't filter if age not set
  if (minAge === undefined && maxAge === undefined) return true; // No preference set
  if (minAge !== undefined && age < minAge) return false;
  if (maxAge !== undefined && age > maxAge) return false;
  return true;
}

/**
 * Check if a profile matches height preference
 */
export function matchesHeightPreference(
  heightInches: number | undefined,
  minHeight?: number,
  maxHeight?: number
): boolean {
  if (heightInches === undefined) return true; // Can't filter if height not set
  if (minHeight === undefined && maxHeight === undefined) return true; // No preference set
  if (minHeight !== undefined && heightInches < minHeight) return false;
  if (maxHeight !== undefined && heightInches > maxHeight) return false;
  return true;
}

/**
 * Check if a profile matches array-based preference (education, religion, etc.)
 */
export function matchesArrayPreference(
  value: string | undefined,
  preferences?: string[]
): boolean {
  if (value === undefined || value === 'prefer-not-to-say') return true; // Can't filter if not set
  if (!preferences || preferences.length === 0) return true; // No preference set
  return preferences.includes(value);
}

/**
 * Check if a profile matches kids preference
 */
export function matchesKidsPreference(
  hasKids?: string,
  wantsKids?: string,
  hasKidsPreference?: 'yes' | 'no' | 'either' | 'prefer-not-to-say',
  wantsKidsPreference?: 'yes' | 'no' | 'maybe' | 'either' | 'prefer-not-to-say'
): boolean {
  // Has kids preference
  if (hasKidsPreference && hasKidsPreference !== 'prefer-not-to-say' && hasKidsPreference !== 'either') {
    if (hasKids === undefined || hasKids === 'prefer-not-to-say') return true; // Can't filter
    if (hasKidsPreference === 'yes' && hasKids !== 'yes') return false;
    if (hasKidsPreference === 'no' && hasKids !== 'no') return false;
  }

  // Wants kids preference
  if (wantsKidsPreference && wantsKidsPreference !== 'prefer-not-to-say' && wantsKidsPreference !== 'either') {
    if (wantsKids === undefined || wantsKids === 'prefer-not-to-say') return true; // Can't filter
    if (wantsKidsPreference === 'yes' && wantsKids !== 'yes') return false;
    if (wantsKidsPreference === 'no' && wantsKids !== 'no') return false;
    if (wantsKidsPreference === 'maybe') return true; // "maybe" accepts any value
  }

  return true;
}

/**
 * Extended member profile with demographics (for type safety)
 */
interface MemberWithDemographics {
  id: string;
  name: string;
  age?: number;
  photo_url?: string;
  gender?: Gender;
  preference?: Preference;
  location?: string | { coordinates: [number, number] };
  height_inches?: number;
  education_level?: string;
  religion?: string;
  political_views?: string;
  drinking_habit?: string;
  smoking_habit?: string;
  exercise_frequency?: string;
  relationship_goal?: string;
  has_kids?: string;
  wants_kids?: string;
  languages?: string[];
}

/**
 * Check if a duo matches user preferences (dealbreakers are hard filters)
 */
export function duoMatchesPreferences(
  duo: DuoWithMembers,
  preferences: UserPreferences | null | undefined,
  userLocation?: { latitude: number; longitude: number }
): { matches: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (!preferences) {
    return { matches: true, reasons: [] };
  }

  const dealbreakers = preferences.dealbreakers || {};
  const members: MemberWithDemographics[] = [duo.member1, duo.member2] as MemberWithDemographics[];

  // Check each member against preferences
  for (const member of members) {
    // Age check (dealbreaker if set)
    if (dealbreakers.age || (preferences.min_age !== undefined || preferences.max_age !== undefined)) {
      if (!matchesAgePreference(member.age, preferences.min_age, preferences.max_age)) {
        if (dealbreakers.age) {
          return { matches: false, reasons: [] };
        }
      } else if (member.age !== undefined) {
        reasons.push('Age preference match');
      }
    }

    // Height check (dealbreaker if set)
    const memberHeight = member.height_inches;
    if (dealbreakers.height || (preferences.min_height_inches !== undefined || preferences.max_height_inches !== undefined)) {
      if (!matchesHeightPreference(memberHeight, preferences.min_height_inches, preferences.max_height_inches)) {
        if (dealbreakers.height) {
          return { matches: false, reasons: [] };
        }
      } else if (memberHeight !== undefined) {
        reasons.push('Height preference match');
      }
    }

    // Education check (dealbreaker if set)
    if (dealbreakers.education || (preferences.education_levels && preferences.education_levels.length > 0)) {
      const memberEducation = member.education_level;
      if (!matchesArrayPreference(memberEducation, preferences.education_levels)) {
        if (dealbreakers.education) {
          return { matches: false, reasons: [] };
        }
      } else if (memberEducation) {
        reasons.push('Education preference match');
      }
    }

    // Religion check (dealbreaker if set)
    if (dealbreakers.religion || (preferences.religions && preferences.religions.length > 0)) {
      const memberReligion = member.religion;
      if (!matchesArrayPreference(memberReligion, preferences.religions)) {
        if (dealbreakers.religion) {
          return { matches: false, reasons: [] };
        }
      } else if (memberReligion) {
        reasons.push('Religion preference match');
      }
    }

    // Political views check (dealbreaker if set)
    if (dealbreakers.political || (preferences.political_views && preferences.political_views.length > 0)) {
      const memberPolitical = member.political_views;
      if (!matchesArrayPreference(memberPolitical, preferences.political_views)) {
        if (dealbreakers.political) {
          return { matches: false, reasons: [] };
        }
      } else if (memberPolitical) {
        reasons.push('Political views match');
      }
    }

    // Lifestyle checks
    const memberDrinking = member.drinking_habit;
    const memberSmoking = member.smoking_habit;
    const memberExercise = member.exercise_frequency;

    if (dealbreakers.drinking || (preferences.drinking_habits && preferences.drinking_habits.length > 0)) {
      if (!matchesArrayPreference(memberDrinking, preferences.drinking_habits)) {
        if (dealbreakers.drinking) {
          return { matches: false, reasons: [] };
        }
      } else if (memberDrinking) {
        reasons.push('Drinking habit match');
      }
    }

    if (dealbreakers.smoking || (preferences.smoking_habits && preferences.smoking_habits.length > 0)) {
      if (!matchesArrayPreference(memberSmoking, preferences.smoking_habits)) {
        if (dealbreakers.smoking) {
          return { matches: false, reasons: [] };
        }
      } else if (memberSmoking) {
        reasons.push('Smoking habit match');
      }
    }

    if (preferences.exercise_frequencies && preferences.exercise_frequencies.length > 0) {
      if (matchesArrayPreference(memberExercise, preferences.exercise_frequencies)) {
        reasons.push('Exercise frequency match');
      }
    }

    // Relationship goal check
    if (preferences.relationship_goals && preferences.relationship_goals.length > 0) {
      const memberGoal = member.relationship_goal;
      if (matchesArrayPreference(memberGoal, preferences.relationship_goals)) {
        reasons.push('Relationship goal match');
      }
    }

    // Kids checks
    const memberHasKids = member.has_kids;
    const memberWantsKids = member.wants_kids;
    if (dealbreakers.has_kids || dealbreakers.wants_kids || preferences.has_kids_preference || preferences.wants_kids_preference) {
      if (!matchesKidsPreference(
        memberHasKids,
        memberWantsKids,
        preferences.has_kids_preference,
        preferences.wants_kids_preference
      )) {
        if (dealbreakers.has_kids || dealbreakers.wants_kids) {
          return { matches: false, reasons: [] };
        }
      } else if (memberHasKids || memberWantsKids) {
        reasons.push('Kids preference match');
      }
    }

    // Language check
    if (preferences.languages && preferences.languages.length > 0) {
      const memberLanguages = member.languages || [];
      const hasCommonLanguage = preferences.languages.some(lang => memberLanguages.includes(lang));
      if (hasCommonLanguage) {
        reasons.push('Common language');
      }
    }

    // Distance check (dealbreaker if set, or regular preference)
    if (userLocation && preferences.max_distance_miles) {
      const memberCoords = member.location ? extractCoordinatesFromPoint(member.location) : null;
      if (memberCoords) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          memberCoords.latitude,
          memberCoords.longitude
        );
        if (distance > preferences.max_distance_miles) {
          // If distance is a dealbreaker, exclude completely
          if (dealbreakers.distance) {
            return { matches: false, reasons: [] };
          }
          // Otherwise, just don't add it as a reason (soft filter)
        } else {
          reasons.push('Within distance preference');
        }
      }
    }
  }

  return { matches: true, reasons: [...new Set(reasons)] }; // Remove duplicates
}

/**
 * Calculate compatibility score between a user and a duo
 * Returns a score from 0-100 based on various factors
 */
export function calculateCompatibilityScore(
  userProfile: ProfileWithDemographics,
  userInterests: string[],
  duo: DuoWithMembers,
  duoInterests: string[],
  preferences: UserPreferences | null | undefined,
  userLocation?: { latitude: number; longitude: number }
): CompatibilityScore {
  const scores: CompatibilityScore = {
    total: 0,
    age: 0,
    height: 0,
    education: 0,
    lifestyle: 0,
    values: 0,
    interests: 0,
    distance: 0,
    reasons: [],
  };

  if (!preferences) {
    // No preferences set, return neutral score
    scores.total = 50;
    return scores;
  }

  const members: MemberWithDemographics[] = [duo.member1, duo.member2] as MemberWithDemographics[];
  let totalScore = 0;
  let maxScore = 0;

  // Age compatibility (0-15 points)
  maxScore += 15;
  for (const member of members) {
    if (member.age !== undefined && userProfile.age !== undefined) {
      const ageDiff = Math.abs(member.age - userProfile.age);
      if (preferences.min_age !== undefined && preferences.max_age !== undefined) {
        const range = preferences.max_age - preferences.min_age;
        if (range > 0) {
          const ageScore = Math.max(0, 15 * (1 - ageDiff / range));
          totalScore += ageScore;
          if (ageScore > 0) scores.reasons.push('Similar age');
        }
      }
    }
  }
  scores.age = totalScore / members.length;

  // Height compatibility (0-10 points)
  maxScore += 10;
  const userHeight = userProfile.height_inches;
  for (const member of members) {
    const memberHeight = member.height_inches;
    if (userHeight !== undefined && memberHeight !== undefined) {
      const heightDiff = Math.abs(memberHeight - userHeight);
      const heightScore = Math.max(0, 10 * (1 - heightDiff / 12)); // 12 inches = 1 foot tolerance
      totalScore += heightScore;
      if (heightScore > 0) scores.reasons.push('Similar height');
    }
  }
  scores.height = totalScore / members.length;

  // Education compatibility (0-10 points)
  maxScore += 10;
  for (const member of members) {
    const memberEducation = member.education_level;
    if (userProfile.education_level && memberEducation) {
      if (userProfile.education_level === memberEducation) {
        totalScore += 10;
        scores.reasons.push('Same education level');
      } else {
        totalScore += 5; // Partial match
      }
    }
  }
  scores.education = totalScore / members.length;

  // Lifestyle compatibility (0-20 points)
  maxScore += 20;
  for (const member of members) {
    let lifestyleScore = 0;
    if (userProfile.drinking_habit && member.drinking_habit) {
      if (userProfile.drinking_habit === member.drinking_habit) {
        lifestyleScore += 5;
      }
    }
    if (userProfile.smoking_habit && member.smoking_habit) {
      if (userProfile.smoking_habit === member.smoking_habit) {
        lifestyleScore += 5;
      }
    }
    if (userProfile.exercise_frequency && member.exercise_frequency) {
      if (userProfile.exercise_frequency === member.exercise_frequency) {
        lifestyleScore += 10;
        scores.reasons.push('Similar exercise habits');
      }
    }
    totalScore += lifestyleScore;
  }
  scores.lifestyle = totalScore / members.length;

  // Values compatibility (0-15 points)
  maxScore += 15;
  for (const member of members) {
    let valuesScore = 0;
    if (userProfile.religion && member.religion) {
      if (userProfile.religion === member.religion) {
        valuesScore += 8;
        scores.reasons.push('Same religion');
      }
    }
    if (userProfile.political_views && member.political_views) {
      if (userProfile.political_views === member.political_views) {
        valuesScore += 7;
        scores.reasons.push('Similar political views');
      }
    }
    totalScore += valuesScore;
  }
  scores.values = totalScore / members.length;

  // Interests compatibility (0-20 points)
  maxScore += 20;
  if (userInterests.length > 0 && duoInterests.length > 0) {
    const commonInterests = userInterests.filter(interest => 
      duoInterests.some(di => di.toLowerCase() === interest.toLowerCase())
    );
    const interestScore = (commonInterests.length / Math.max(userInterests.length, duoInterests.length)) * 20;
    totalScore += interestScore;
    scores.interests = interestScore;
    if (commonInterests.length > 0) {
      scores.reasons.push(`${commonInterests.length} shared interest${commonInterests.length > 1 ? 's' : ''}`);
    }
  }

  // Distance compatibility (0-10 points)
  maxScore += 10;
  if (userLocation && preferences.max_distance_miles) {
    for (const member of members) {
      const memberCoords = member.location ? extractCoordinatesFromPoint(member.location) : null;
      if (memberCoords) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          memberCoords.latitude,
          memberCoords.longitude
        );
        if (distance <= preferences.max_distance_miles) {
          const distanceScore = 10 * (1 - distance / preferences.max_distance_miles);
          totalScore += distanceScore;
          scores.distance = distanceScore;
          scores.reasons.push('Nearby');
        }
      }
    }
  }

  // Calculate final score (0-100)
  scores.total = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;
  scores.total = Math.min(100, Math.max(0, scores.total));

  return scores;
}

