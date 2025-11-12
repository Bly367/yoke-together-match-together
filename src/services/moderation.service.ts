/**
 * Content moderation service
 * Provides basic client-side content filtering. For production, integrate with
 * a professional moderation API (e.g., Google Cloud Content Moderation, AWS Comprehend, etc.)
 */

/**
 * List of inappropriate words/phrases (basic example)
 * In production, use a comprehensive list or API service
 */
const INAPPROPRIATE_WORDS = [
  // Add inappropriate words here - keeping minimal for example
  // In production, use a comprehensive moderation service
];

/**
 * Patterns that indicate inappropriate content
 */
const INAPPROPRIATE_PATTERNS = [
  /(?:^|\s)([a-z])\1{4,}/i, // Repeated characters (e.g., "aaaaaa")
  /(?:^|\s)[\w\s]{0,5}(?:sex|porn|nude|explicit)/i, // Explicit content keywords
];

/**
 * Check if content contains inappropriate material
 * @param content - The content to check
 * @returns Object with moderation result
 */
export function moderateContent(content: string): {
  isApproved: boolean;
  reason?: string;
  confidence: number;
} {
  if (!content || content.trim().length === 0) {
    return { isApproved: false, reason: 'Content is empty', confidence: 1.0 };
  }

  const normalizedContent = content.toLowerCase().trim();

  // Check against inappropriate words list
  for (const word of INAPPROPRIATE_WORDS) {
    if (normalizedContent.includes(word.toLowerCase())) {
      return {
        isApproved: false,
        reason: 'Contains inappropriate language',
        confidence: 0.9,
      };
    }
  }

  // Check against patterns
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(content)) {
      return {
        isApproved: false,
        reason: 'Contains inappropriate content',
        confidence: 0.8,
      };
    }
  }

  // Check for excessive length (potential spam)
  if (content.length > 5000) {
    return {
      isApproved: false,
      reason: 'Message is too long',
      confidence: 0.7,
    };
  }

  // Check for excessive repetition (potential spam)
  const words = content.split(/\s+/);
  if (words.length > 3) {
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    if (repetitionRatio < 0.3) {
      return {
        isApproved: false,
        reason: 'Contains excessive repetition',
        confidence: 0.6,
      };
    }
  }

  return { isApproved: true, confidence: 1.0 };
}

/**
 * Sanitize content by removing potentially harmful characters
 * @param content - The content to sanitize
 * @returns Sanitized content
 */
export function sanitizeContent(content: string): string {
  return content
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 5000); // Limit length
}

/**
 * Validate message content before sending
 * @param content - The message content
 * @returns Validation result
 */
export function validateMessage(content: string): {
  isValid: boolean;
  error?: string;
  sanitized?: string;
} {
  const sanitized = sanitizeContent(content);

  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: 'Message cannot be empty',
    };
  }

  if (sanitized.length < 1) {
    return {
      isValid: false,
      error: 'Message is too short',
    };
  }

  const moderation = moderateContent(sanitized);
  if (!moderation.isApproved) {
    return {
      isValid: false,
      error: moderation.reason || 'Message contains inappropriate content',
    };
  }

  return {
    isValid: true,
    sanitized,
  };
}

