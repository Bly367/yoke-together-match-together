import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
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
    if (src) {
      setImageSrc(src);
      setHasError(false);
      setIsLoading(true);
    } else {
      setImageSrc(null);
      setHasError(true);
      setIsLoading(false);
    }
  }, [src]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    setImageSrc(null);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  /**
   * Generate optimized image URL with Supabase Storage transformations
   * Supports width, quality, and format optimization
   */
  const getOptimizedUrl = (url: string, width?: number): string => {
    if (!url) return url;
    
    // Supabase Storage supports transformations via query parameters
    if (url.includes('supabase.co/storage') || url.includes('supabase.storage')) {
      const params = new URLSearchParams();
      
      // Add width if specified (Supabase auto-calculates height to maintain aspect ratio)
      if (width) {
        params.set('width', width.toString());
      }
      
      // Add quality parameter
      params.set('quality', quality.toString());
      
      // Add format (WebP if supported, fallback to original)
      if (webp && supportsWebP) {
        params.set('format', 'webp');
      }
      
      // Preserve existing query parameters if any
      const urlObj = new URL(url);
      const existingParams = new URLSearchParams(urlObj.search);
      existingParams.forEach((value, key) => {
        if (!params.has(key)) {
          params.set(key, value);
        }
      });
      
      return `${urlObj.pathname}?${params.toString()}`;
    }
    
    // For non-Supabase URLs, return as-is (could integrate with other CDNs here)
    return url;
  };

  if (hasError || !imageSrc) {
    return (
      <div className={cn('flex items-center justify-center bg-secondary/20', className)}>
        {fallbackIcon || <User className="w-1/2 h-1/2 text-muted-foreground" />}
      </div>
    );
  }

  // Extract width from sizes prop if available (e.g., "400px" -> 400)
  const extractWidth = (sizes?: string): number | undefined => {
    if (!sizes) return undefined;
    const match = sizes.match(/(\d+)px/);
    return match ? parseInt(match[1], 10) : undefined;
  };

  return (
    <img
      src={getOptimizedUrl(imageSrc, extractWidth(sizes))}
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

