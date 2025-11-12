import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Keyboard shortcuts hook
 * Provides keyboard shortcuts for navigation and common actions
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or contenteditable elements
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey === undefined ? true : event.ctrlKey === shortcut.ctrlKey;
        const shiftMatch = shortcut.shiftKey === undefined ? true : event.shiftKey === shortcut.shiftKey;
        const altMatch = shortcut.altKey === undefined ? true : event.altKey === shortcut.altKey;
        const metaMatch = shortcut.metaKey === undefined ? true : event.metaKey === shortcut.metaKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Default keyboard shortcuts for navigation
 */
export function useDefaultKeyboardShortcuts() {
  const navigate = useNavigate();

  useKeyboardShortcuts([
    {
      key: '1',
      ctrlKey: true,
      action: () => navigate(ROUTES.MATCHMAKING),
      description: 'Go to Discover',
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => navigate(ROUTES.MESSAGES),
      description: 'Go to Messages',
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => navigate(ROUTES.MATCHES),
      description: 'Go to Matches',
    },
    {
      key: '4',
      ctrlKey: true,
      action: () => navigate(ROUTES.PROFILE),
      description: 'Go to Profile',
    },
    {
      key: 'ArrowLeft',
      altKey: true,
      action: () => window.history.back(),
      description: 'Go back',
    },
    {
      key: 'ArrowRight',
      altKey: true,
      action: () => window.history.forward(),
      description: 'Go forward',
    },
    {
      key: '/',
      ctrlKey: true,
      action: () => {
        // Focus search if available
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="Search" i]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus search',
    },
  ]);
}

