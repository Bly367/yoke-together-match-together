import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestNotificationPermission, areNotificationsEnabled, shouldShowNotification, showNotification, notifyNewDuoRequest, notifyNewMessage, notifyNewMatch } from '../notifications';

describe('notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Notification API
    global.Notification = vi.fn().mockImplementation((title, options) => ({
      title,
      ...options,
      onclick: null,
    })) as any;
    global.Notification.permission = 'default';
    global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestNotificationPermission', () => {
    it('should return true if permission already granted', async () => {
      global.Notification.permission = 'granted';
      const result = await requestNotificationPermission();
      expect(result).toBe(true);
    });

    it('should request permission if not set', async () => {
      global.Notification.permission = 'default';
      const result = await requestNotificationPermission();
      expect(global.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if permission denied', async () => {
      global.Notification.permission = 'denied';
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('should return false if Notification not supported', async () => {
      delete (global as any).Notification;
      const result = await requestNotificationPermission();
      expect(result).toBe(false);
    });
  });

  describe('areNotificationsEnabled', () => {
    it('should return true if permission granted', () => {
      global.Notification.permission = 'granted';
      expect(areNotificationsEnabled()).toBe(true);
    });

    it('should return false if permission not granted', () => {
      global.Notification.permission = 'default';
      expect(areNotificationsEnabled()).toBe(false);
    });

    it('should return false if Notification not supported', () => {
      delete (global as any).Notification;
      expect(areNotificationsEnabled()).toBe(false);
    });
  });

  describe('shouldShowNotification', () => {
    it('should return true if document is hidden', () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
      expect(shouldShowNotification()).toBe(true);
    });

    it('should return true if document does not have focus', () => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      Object.defineProperty(document, 'hasFocus', { value: () => false, writable: true });
      expect(shouldShowNotification()).toBe(true);
    });
  });

  describe('showNotification', () => {
    it('should show notification if permission granted', () => {
      global.Notification.permission = 'granted';
      const notification = showNotification('Test', { body: 'Test body' });
      expect(notification).not.toBeNull();
      expect(global.Notification).toHaveBeenCalled();
    });

    it('should return null if permission not granted', () => {
      global.Notification.permission = 'default';
      const notification = showNotification('Test');
      expect(notification).toBeNull();
    });
  });

  describe('notifyNewDuoRequest', () => {
    it('should show duo request notification', () => {
      global.Notification.permission = 'granted';
      const notification = notifyNewDuoRequest('John Doe');
      expect(notification).not.toBeNull();
      expect(global.Notification).toHaveBeenCalledWith(
        'New Duo Request! 🎉',
        expect.objectContaining({
          body: 'John Doe wants to form a duo with you',
        })
      );
    });
  });

  describe('notifyNewMessage', () => {
    it('should show message notification', () => {
      global.Notification.permission = 'granted';
      const notification = notifyNewMessage('Jane', 'Hello!', 'match123');
      expect(notification).not.toBeNull();
      expect(global.Notification).toHaveBeenCalledWith(
        'New message from Jane',
        expect.objectContaining({
          body: 'Hello!',
        })
      );
    });

    it('should truncate long messages', () => {
      global.Notification.permission = 'granted';
      const longMessage = 'A'.repeat(100);
      const notification = notifyNewMessage('Jane', longMessage, 'match123');
      expect(notification).not.toBeNull();
      expect(global.Notification).toHaveBeenCalledWith(
        'New message from Jane',
        expect.objectContaining({
          body: expect.stringContaining('...'),
        })
      );
    });
  });

  describe('notifyNewMatch', () => {
    it('should show match notification', () => {
      global.Notification.permission = 'granted';
      const notification = notifyNewMatch('Duo Name');
      expect(notification).not.toBeNull();
      expect(global.Notification).toHaveBeenCalledWith(
        'New Match! 🎉',
        expect.objectContaining({
          body: 'You matched with Duo Name',
        })
      );
    });
  });
});

