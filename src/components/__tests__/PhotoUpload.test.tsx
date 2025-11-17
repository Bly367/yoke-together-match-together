import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhotoUpload } from '../PhotoUpload';
import * as useStorage from '@/hooks/useStorage';
import * as utils from '@/lib/utils';

vi.mock('@/hooks/useStorage');
vi.mock('@/lib/utils');
vi.mock('react-easy-crop', () => ({
  default: () => React.createElement('div', {}, 'Cropper'),
}));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('PhotoUpload', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
    
    vi.mocked(useStorage.useUploadPhoto).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue('https://example.com/photo.jpg'),
      mutate: vi.fn(),
      isPending: false,
    } as any);
    
    vi.mocked(useStorage.useDeletePhoto).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      mutate: vi.fn(),
      isPending: false,
    } as any);
    
    vi.mocked(utils.createCroppedImage).mockResolvedValue(new Blob(['test'], { type: 'image/jpeg' }));
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('should render photo upload component', () => {
    const onPhotoUploaded = vi.fn();
    
    render(
      wrapper({
        children: React.createElement(PhotoUpload, {
          userId: 'user1',
          onPhotoUploaded,
        }),
      }) as any
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should display current photo if provided', () => {
    const onPhotoUploaded = vi.fn();
    
    render(
      wrapper({
        children: React.createElement(PhotoUpload, {
          userId: 'user1',
          currentPhotoUrl: 'https://example.com/photo.jpg',
          onPhotoUploaded,
        }),
      }) as any
    );

    const img = screen.getByAltText('Profile');
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('should handle file selection', async () => {
    const user = userEvent.setup();
    const onPhotoUploaded = vi.fn();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    const { container } = render(
      wrapper({
        children: React.createElement(PhotoUpload, {
          userId: 'user1',
          onPhotoUploaded,
        }),
      }) as any
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
        configurable: true,
      });
      
      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      Object.defineProperty(changeEvent, 'target', {
        value: { files: [file] },
        writable: false,
      });
      input.dispatchEvent(changeEvent);

      await waitFor(() => {
        expect(screen.queryByText(/crop/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    }
  });

  it('should reject invalid file types', async () => {
    const onPhotoUploaded = vi.fn();
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const toast = require('sonner').toast;
    
    const { container } = render(
      wrapper({
        children: React.createElement(PhotoUpload, {
          userId: 'user1',
          onPhotoUploaded,
        }),
      }) as any
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
        configurable: true,
      });
      
      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      Object.defineProperty(changeEvent, 'target', {
        value: { files: [file] },
        writable: false,
      });
      input.dispatchEvent(changeEvent);

      // Should show error toast (mocked)
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      }, { timeout: 3000 });
    }
  });
});

