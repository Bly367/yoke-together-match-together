import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUploadPhoto, useDeletePhoto, useUploadMessageAttachment, useDeleteMessageAttachment } from '../useStorage';
import * as storageService from '@/services/storage.service';

vi.mock('@/services/storage.service');

describe('useStorage', () => {
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

  describe('useUploadPhoto', () => {
    it('should upload photo', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockUrl = 'https://example.com/photo.jpg';
      vi.mocked(storageService.uploadPhoto).mockResolvedValue(mockUrl);

      const { result } = renderHook(() => useUploadPhoto(), { wrapper });

      result.current.mutate({ file: mockFile, userId: 'user1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(storageService.uploadPhoto).toHaveBeenCalledWith(mockFile, 'user1', undefined);
    });
  });

  describe('useDeletePhoto', () => {
    it('should delete photo', async () => {
      vi.mocked(storageService.deletePhoto).mockResolvedValue();

      const { result } = renderHook(() => useDeletePhoto(), { wrapper });

      result.current.mutate('https://example.com/photo.jpg');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(storageService.deletePhoto).toHaveBeenCalledWith('https://example.com/photo.jpg');
    });
  });

  describe('useUploadMessageAttachment', () => {
    it('should upload attachment', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const mockAttachment = { url: 'https://example.com/file.pdf', type: 'application/pdf', name: 'test.pdf', size: 1000 };
      vi.mocked(storageService.uploadMessageAttachment).mockResolvedValue(mockAttachment);

      const { result } = renderHook(() => useUploadMessageAttachment(), { wrapper });

      result.current.mutate({ file: mockFile, userId: 'user1', matchId: 'match1' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(storageService.uploadMessageAttachment).toHaveBeenCalledWith(mockFile, 'user1', 'match1');
    });
  });

  describe('useDeleteMessageAttachment', () => {
    it('should delete attachment', async () => {
      vi.mocked(storageService.deleteMessageAttachment).mockResolvedValue();

      const { result } = renderHook(() => useDeleteMessageAttachment(), { wrapper });

      result.current.mutate('https://example.com/file.pdf');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(storageService.deleteMessageAttachment).toHaveBeenCalledWith('https://example.com/file.pdf');
    });
  });
});

