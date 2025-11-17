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
  PREFERENCES: "/preferences",
  NOTIFICATION_SETTINGS: "/notification-settings",
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
  /**
   * Base path for private messages routes
   */
  PRIVATE_MESSAGES_BASE: "/private-messages",
  /**
   * Private messages list route
   */
  PRIVATE_MESSAGES: "/private-messages",
  /**
   * Base path for private chat routes
   */
  PRIVATE_CHAT_BASE: "/private-chat",
  /**
   * Generate private chat route with conversation ID
   */
  PRIVATE_CHAT: (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') {
      throw new Error('conversationId must be a non-empty string');
    }
    return `/private-chat/${conversationId}`;
  },
  /**
   * Base path for game session routes
   */
  GAME_SESSION_BASE: "/game",
  /**
   * Generate game session route with match ID and session ID
   */
  GAME_SESSION: (matchId: string, sessionId: string) => {
    if (!matchId || typeof matchId !== 'string') {
      throw new Error('matchId must be a non-empty string');
    }
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('sessionId must be a non-empty string');
    }
    return `/match/${matchId}/game/${sessionId}`;
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
  ROUTES.NOTIFICATION_SETTINGS,
] as const;

