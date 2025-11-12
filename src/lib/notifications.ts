/**
 * Browser notification utilities
 */

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
}

/**
 * Check if app should show notifications (app is in background)
 */
export function shouldShowNotification(): boolean {
  return document.visibilityState === 'hidden' || !document.hasFocus();
}

/**
 * Show a browser notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (!areNotificationsEnabled()) {
    return null;
  }

  try {
    return new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
    return null;
  }
}

/**
 * Show notification for new duo request
 */
export function notifyNewDuoRequest(requesterName: string): Notification | null {
  const notification = showNotification('New Duo Request! 🎉', {
    body: `${requesterName} wants to form a duo with you`,
    tag: 'duo-request', // Replace previous notifications with same tag
    requireInteraction: false,
    silent: false,
    data: { type: 'duo-request' },
  });

  // Handle click to navigate to duo requests
  if (notification) {
    notification.onclick = () => {
      window.focus();
      // Navigate to duo requests page
      if (window.location.pathname !== '/duo-requests') {
        window.location.href = '/duo-requests';
      }
    };
  }

  return notification;
}

/**
 * Show notification for new message
 */
export function notifyNewMessage(
  senderName: string,
  messagePreview: string,
  matchId: string
): Notification | null {
  const truncatedPreview = messagePreview.length > 50 
    ? messagePreview.substring(0, 50) + '...' 
    : messagePreview;

  const notification = showNotification(`New message from ${senderName}`, {
    body: truncatedPreview,
    tag: `message-${matchId}`, // Replace previous notifications for same match
    requireInteraction: false,
    silent: false,
    data: { matchId, type: 'message' },
  });

  // Handle click to navigate to chat
  if (notification) {
    notification.onclick = () => {
      window.focus();
      // Navigate to chat
      if (window.location.pathname !== `/chat/${matchId}`) {
        window.location.href = `/chat/${matchId}`;
      }
    };
  }

  return notification;
}

/**
 * Show notification for new match
 */
export function notifyNewMatch(otherDuoName: string): Notification | null {
  const notification = showNotification('New Match! 🎉', {
    body: `You matched with ${otherDuoName}`,
    tag: 'new-match',
    requireInteraction: false,
    silent: false,
    data: { type: 'match' },
  });

  // Handle click to navigate to matches
  if (notification) {
    notification.onclick = () => {
      window.focus();
      // Navigate to matches page
      if (window.location.pathname !== '/matches') {
        window.location.href = '/matches';
      }
    };
  }

  return notification;
}

