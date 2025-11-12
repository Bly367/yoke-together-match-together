/**
 * Centralized route constants
 * All route paths should be defined here to avoid duplication and enable easy refactoring
 */
export const ROUTES = {
  INDEX: "/",
  AUTH: "/auth",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  PROFILE_SETUP: "/profile-setup",
  DUO_SETUP: "/duo-setup",
  DUO_REQUESTS: "/duo-requests",
  MATCHMAKING: "/matchmaking",
  MATCHES: "/matches",
  MESSAGES: "/messages",
  PROFILE: "/profile",
  NOT_FOUND: "*",
  /**
   * Base path for chat routes
   */
  CHAT_BASE: "/chat",
  /**
   * Generate chat route with match ID
   */
  CHAT: (matchId: string) => {
    if (!matchId || typeof matchId !== 'string') {
      throw new Error('matchId must be a non-empty string');
    }
    return `/chat/${matchId}`;
  },
  /**
   * Base path for join duo routes
   */
  JOIN_DUO_BASE: "/join-duo",
  /**
   * Generate join duo route with user ID
   */
  JOIN_DUO: (userId: string) => {
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId must be a non-empty string');
    }
    return `/join-duo/${userId}`;
  },
} as const;

/**
 * Static route paths as array for easier iteration if needed
 */
export const STATIC_ROUTES = [
  ROUTES.INDEX,
  ROUTES.AUTH,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.PROFILE_SETUP,
  ROUTES.DUO_SETUP,
  ROUTES.DUO_REQUESTS,
  ROUTES.MATCHMAKING,
  ROUTES.MATCHES,
  ROUTES.MESSAGES,
  ROUTES.PROFILE,
] as const;

