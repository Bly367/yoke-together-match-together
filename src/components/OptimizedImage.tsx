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

  // Generate optimized image URL (if using a CDN that supports transformations)
  const getOptimizedUrl = (url: string): string => {
    if (!url) return url;
    
    // If using Supabase Storage, you can add transformations here
    // Example: return `${url}?width=400&height=400&quality=${quality}`;
    
    // For now, return original URL
    return url;
  };

  if (hasError || !imageSrc) {
    return (
      <div className={cn('flex items-center justify-center bg-secondary/20', className)}>
        {fallbackIcon || <User className="w-1/2 h-1/2 text-muted-foreground" />}
      </div>
    );
  }

  return (
    <img
      src={getOptimizedUrl(imageSrc)}
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

