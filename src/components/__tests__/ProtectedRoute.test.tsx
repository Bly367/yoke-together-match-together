import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from '../ProtectedRoute';
import * as useAuth from '@/hooks/useAuth';

vi.mock('@/hooks/useAuth');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProtectedRoute', () => {
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
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, {}, children)
    );
  };

  it('should render children when user is authenticated', () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      user: { id: 'user1' } as any,
      isLoading: false,
      error: null,
      isAuthenticated: true,
      signOut: vi.fn(),
      isSigningOut: false,
      signOutError: null,
    });

    render(
      wrapper({
        children: React.createElement(ProtectedRoute, {}, React.createElement('div', {}, 'Protected Content')),
      }) as any
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should show loading when checking authentication', () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      user: null,
      isLoading: true,
      error: null,
      isAuthenticated: false,
      signOut: vi.fn(),
      isSigningOut: false,
      signOutError: null,
    });

    render(
      wrapper({
        children: React.createElement(ProtectedRoute, {}, React.createElement('div', {}, 'Protected Content')),
      }) as any
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should redirect when user is not authenticated', async () => {
    vi.mocked(useAuth.useAuth).mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      signOut: vi.fn(),
      isSigningOut: false,
      signOutError: null,
    });

    render(
      wrapper({
        children: React.createElement(ProtectedRoute, {}, React.createElement('div', {}, 'Protected Content')),
      }) as any
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});

