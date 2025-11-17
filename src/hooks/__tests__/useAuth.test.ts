import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, useSignUp, useSignIn, useUpdateProfile, useResetPassword, useUpdatePassword } from '../useAuth';
import * as authService from '@/services/auth.service';

vi.mock('@/services/auth.service');

describe('useAuth', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe('useAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com', name: 'Test User' };
      vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser as any);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return null when not authenticated', async () => {
      vi.mocked(authService.getCurrentUser).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('useSignUp', () => {
    it('should sign up user', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com', name: 'Test User' };
      vi.mocked(authService.signUp).mockResolvedValue(mockUser as any);

      const { result } = renderHook(() => useSignUp(), { wrapper });

      result.current.mutate({ email: 'test@example.com', password: 'password123', name: 'Test User' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
    });
  });

  describe('useSignIn', () => {
    it('should sign in user', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com', name: 'Test User' };
      vi.mocked(authService.signIn).mockResolvedValue(mockUser as any);

      const { result } = renderHook(() => useSignIn(), { wrapper });

      result.current.mutate({ email: 'test@example.com', password: 'password123' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  describe('useUpdateProfile', () => {
    it('should update profile with optimistic update', async () => {
      const mockUser = { id: 'user1', name: 'Old Name' };
      const updatedUser = { id: 'user1', name: 'New Name' };
      
      queryClient.setQueryData(['auth', 'currentUser'], mockUser);
      vi.mocked(authService.updateProfile).mockResolvedValue(updatedUser as any);

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      result.current.mutate({ name: 'New Name' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.updateProfile).toHaveBeenCalledWith({ name: 'New Name' });
    });
  });

  describe('useResetPassword', () => {
    it('should send reset password email', async () => {
      vi.mocked(authService.resetPassword).mockResolvedValue();

      const { result } = renderHook(() => useResetPassword(), { wrapper });

      result.current.mutate({ email: 'test@example.com' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.resetPassword).toHaveBeenCalledWith('test@example.com', undefined);
    });
  });

  describe('useUpdatePassword', () => {
    it('should update password', async () => {
      vi.mocked(authService.updatePassword).mockResolvedValue();

      const { result } = renderHook(() => useUpdatePassword(), { wrapper });

      result.current.mutate('newpassword123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(authService.updatePassword).toHaveBeenCalledWith('newpassword123');
    });
  });
});

