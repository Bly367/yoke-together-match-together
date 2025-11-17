import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadPhoto, deletePhoto, getPhotoUrl, uploadMessageAttachment, deleteMessageAttachment } from '../storage.service';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('storage.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadPhoto', () => {
    it('should upload valid photo', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockUrl = 'https://example.com/photo.jpg';

      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockUrl } }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const result = await uploadPhoto(mockFile, 'user1');
      expect(result).toBe(mockUrl);
    });

    it('should reject files larger than 5MB', async () => {
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      await expect(uploadPhoto(largeFile, 'user1')).rejects.toThrow('File size must be less than');
    });

    it('should reject invalid file types', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      await expect(uploadPhoto(invalidFile, 'user1')).rejects.toThrow('Only JPEG, PNG, WebP, and GIF images are allowed');
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo from URL', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        remove: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(deletePhoto('https://example.com/storage/v1/object/public/photos/user1/123.jpg')).resolves.not.toThrow();
    });

    it('should delete photo from path', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        remove: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(deletePhoto('user1/123.jpg')).resolves.not.toThrow();
    });
  });

  describe('getPhotoUrl', () => {
    it('should return public URL', () => {
      const mockUrl = 'https://example.com/photo.jpg';
      
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockUrl } }),
      } as any);

      const result = getPhotoUrl('user1/123.jpg');
      expect(result).toBe(mockUrl);
    });
  });

  describe('uploadMessageAttachment', () => {
    it('should upload valid attachment', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const mockUrl = 'https://example.com/attachment.pdf';

      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockUrl } }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const result = await uploadMessageAttachment(mockFile, 'user1', 'match1');
      expect(result).toEqual({
        url: mockUrl,
        type: 'application/pdf',
        name: 'test.pdf',
        size: mockFile.size,
      });
    });

    it('should reject files larger than 10MB', async () => {
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      await expect(uploadMessageAttachment(largeFile, 'user1', 'match1')).rejects.toThrow('File size must be less than');
    });

    it('should reject invalid file types', async () => {
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-msdownload' });
      
      await expect(uploadMessageAttachment(invalidFile, 'user1', 'match1')).rejects.toThrow('File type not supported');
    });
  });

  describe('deleteMessageAttachment', () => {
    it('should delete attachment', async () => {
      vi.mocked(supabase.storage.from).mockReturnValueOnce({
        remove: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      await expect(deleteMessageAttachment('https://example.com/storage/v1/object/public/photos/messages/match1/user1/123.pdf')).resolves.not.toThrow();
    });
  });
});

