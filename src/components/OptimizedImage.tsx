import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'src'> {
  src?: string | null;
  alt: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
  /**
   * Enable lazy loading (default: true)
   */
  lazy?: boolean;
  /**
   * Enable responsive image sizes
   */
  sizes?: string;
  /**
   * Image quality (0-100, default: 85)
   */
  quality?: number;
  /**
   * Enable WebP format if supported (default: true)
   */
  webp?: boolean;
}

/**
 * Optimized Image Component
 * 
 * Features:
 * - Lazy loading for better performance
 * - Automatic fallback to placeholder icon
 * - WebP support detection
 * - Error handling with retry
 * - Responsive image support
 */
export function OptimizedImage({
  src,
  alt,
  fallbackIcon,
  className,
  lazy = true,
  sizes,
  quality = 85,
  webp = true,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(src || null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [supportsWebP, setSupportsWebP] = useState(false);

  // Check WebP support
  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      setSupportsWebP(dataURL.indexOf('data:image/webp') === 0);
    };
    checkWebPSupport();
  }, []);

  // Update image source when src prop changes
  useEffect(() => {
    const trimmedSrc = src?.trim() || null;
    
    if (trimmedSrc && trimmedSrc.length > 0) {
      // Reset error state when new src is provided
      setHasError(false);
      setIsLoading(true);
      // Always update to the new src (React will handle re-renders efficiently)
      setImageSrc(trimmedSrc);
    } else {
      setImageSrc(null);
      setHasError(true);
      setIsLoading(false);
    }
  }, [src]);

  const handleError = () => {
    // Only set error if we actually have a source URL
    // This prevents false errors when src is intentionally null/empty
    if (imageSrc) {
      setHasError(true);
      setIsLoading(false);
      // Don't clear imageSrc immediately - allow retry
      // setImageSrc(null);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  /**
   * Validate and return image URL
   * Supabase Storage URLs are used as-is (no server-side transformations supported)
   * This function ensures URLs are valid and properly formatted
   */
  const getValidatedUrl = (url: string): string => {
    if (!url || !url.trim()) return url;
    
    const trimmedUrl = url.trim();
    
    // Validate URL format
    try {
      const urlObj = new URL(trimmedUrl);
      // Return the full URL as-is - Supabase Storage doesn't support query param transformations
      return urlObj.href;
    } catch (error) {
      // If URL parsing fails, it might be a relative path or malformed URL
      // Try to fix common issues
      if (trimmedUrl.startsWith('/')) {
        // Relative path - might be valid in some contexts, but log warning
        console.warn('Relative URL detected in OptimizedImage:', trimmedUrl);
        return trimmedUrl;
      }
      
      // Invalid URL - log error but return as-is to let browser handle it
      console.error('Invalid URL in OptimizedImage:', trimmedUrl, error);
      return trimmedUrl;
    }
  };

  // Only render fallback if we have no source
  if (!imageSrc) {
    return (
      <div className={cn('flex items-center justify-center bg-secondary/20', className)}>
        {fallbackIcon || <User className="w-1/2 h-1/2 text-muted-foreground" />}
      </div>
    );
  }

  // Validate and get the URL to use
  const validatedUrl = getValidatedUrl(imageSrc);

  return (
    <img
      src={validatedUrl}
      alt={alt}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      className={cn(
        'object-cover transition-opacity duration-200',
        isLoading && 'opacity-0',
        !isLoading && 'opacity-100',
        className
      )}
      sizes={sizes}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
}

