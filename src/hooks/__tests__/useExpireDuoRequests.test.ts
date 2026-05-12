import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExpireDuoRequests } from '../useExpireDuoRequests';
import { expireOldRequests } from '@/services/duoRequest.service';
import { useAuth } from '../useAuth';
import { logger } from '@/lib/logger';

// Mock dependencies
vi.mock('@/services/duoRequest.service', () => ({
  expireOldRequests: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('useExpireDuoRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not run expiration when user is not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      signOut: vi.fn(),
    } as any);

    renderHook(() => useExpireDuoRequests());

    // Fast-forward time
    vi.advanceTimersByTime(10 * 60 * 1000); // 10 minutes

    expect(expireOldRequests).not.toHaveBeenCalled();
  });

  it('should run expiration check after initial delay when user is authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
    } as any);

    vi.mocked(expireOldRequests).mockResolvedValue(undefined);

    renderHook(() => useExpireDuoRequests());

    // Fast-forward past initial delay (5 minutes)
    vi.advanceTimersByTime(6 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();

    // May be called multiple times due to React StrictMode, but should be called at least once
    expect(expireOldRequests).toHaveBeenCalled();
  });

  it('should run expiration check periodically', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
    } as any);

    vi.mocked(expireOldRequests).mockResolvedValue(undefined);

    renderHook(() => useExpireDuoRequests());

    const initialCallCount = vi.mocked(expireOldRequests).mock.calls.length;

    // Fast-forward past initial delay (5 minutes)
    vi.advanceTimersByTime(6 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();
    expect(expireOldRequests).toHaveBeenCalled();

    const afterInitialCallCount = vi.mocked(expireOldRequests).mock.calls.length;

    // Fast-forward one hour (default interval)
    vi.advanceTimersByTime(60 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();
    expect(expireOldRequests.mock.calls.length).toBeGreaterThan(afterInitialCallCount);

    // Fast-forward another hour
    const beforeThirdCallCount = vi.mocked(expireOldRequests).mock.calls.length;
    vi.advanceTimersByTime(60 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();
    expect(expireOldRequests.mock.calls.length).toBeGreaterThan(beforeThirdCallCount);
  });

  it('should use custom interval when provided', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
    } as any);

    vi.mocked(expireOldRequests).mockResolvedValue(undefined);

    renderHook(() => useExpireDuoRequests(true, 30 * 60 * 1000)); // 30 minutes

    // Fast-forward past initial delay
    vi.advanceTimersByTime(6 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();
    expect(expireOldRequests).toHaveBeenCalled();

    // Fast-forward 30 minutes (custom interval)
    const beforeSecondCallCount = vi.mocked(expireOldRequests).mock.calls.length;
    vi.advanceTimersByTime(30 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();
    expect(expireOldRequests.mock.calls.length).toBeGreaterThan(beforeSecondCallCount);
  });

  it('should not run expiration when disabled', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
    } as any);

    renderHook(() => useExpireDuoRequests(false));

    // Fast-forward time
    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(expireOldRequests).not.toHaveBeenCalled();
  });

  it('should handle expiration errors gracefully', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
    } as any);

    const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.mocked(expireOldRequests).mockRejectedValue(new Error('Expiration failed'));

    renderHook(() => useExpireDuoRequests());

    // Fast-forward past initial delay
    vi.advanceTimersByTime(6 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();

    expect(expireOldRequests).toHaveBeenCalled();
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      'Error expiring duo requests',
      expect.any(Error)
    );

    loggerErrorSpy.mockRestore();
  });

  it('should prevent concurrent expiration checks', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
    } as any);

    // Create a promise that resolves slowly
    let resolvePromise: () => void;
    const slowPromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(expireOldRequests).mockReturnValue(slowPromise);

    const { result } = renderHook(() => useExpireDuoRequests());

    // Fast-forward past initial delay
    vi.advanceTimersByTime(6 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();

    const callCountBeforeManual = vi.mocked(expireOldRequests).mock.calls.length;

    // Trigger manual expiration while first is still running
    result.current.triggerExpiration();
    await vi.runOnlyPendingTimersAsync();

    // Should not increase call count due to concurrent check prevention
    expect(expireOldRequests.mock.calls.length).toBe(callCountBeforeManual);

    // Resolve the promise
    resolvePromise!();
    await vi.runOnlyPendingTimersAsync();

    // Fast-forward another hour
    const callCountBeforeHour = vi.mocked(expireOldRequests).mock.calls.length;
    vi.advanceTimersByTime(60 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();

    // Should have been called again after the hour
    expect(expireOldRequests.mock.calls.length).toBeGreaterThan(callCountBeforeHour);
  });

  it('should provide manual trigger function', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
    } as any);

    vi.mocked(expireOldRequests).mockResolvedValue(undefined);

    const { result } = renderHook(() => useExpireDuoRequests());

    // Manually trigger expiration
    await result.current.triggerExpiration();

    expect(expireOldRequests).toHaveBeenCalledTimes(1);
  });

  it('should clean up intervals on unmount', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      signOut: vi.fn(),
    } as any);

    vi.mocked(expireOldRequests).mockResolvedValue(undefined);

    const { unmount } = renderHook(() => useExpireDuoRequests());

    // Fast-forward past initial delay
    vi.advanceTimersByTime(6 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();
    expect(expireOldRequests).toHaveBeenCalled();

    // Unmount hook
    const callCountBeforeUnmount = vi.mocked(expireOldRequests).mock.calls.length;
    unmount();

    // Fast-forward another hour - should not trigger more calls
    vi.advanceTimersByTime(60 * 60 * 1000);
    await vi.runOnlyPendingTimersAsync();

    // Call count should not increase after unmount
    expect(expireOldRequests.mock.calls.length).toBe(callCountBeforeUnmount);
  });
});

