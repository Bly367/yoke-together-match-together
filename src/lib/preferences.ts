import type { Gender, Preference } from '@/services/auth.service';

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
  // Non-binary matches 'both' preference
  if (gender === 'non-binary' && preference === 'both') return true;
  // "prefer-not-to-say" matches with "both" preference (most inclusive approach)
  if (gender === 'prefer-not-to-say' && preference === 'both') return true;
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

