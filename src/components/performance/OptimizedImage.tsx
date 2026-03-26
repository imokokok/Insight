'use client';

import { useState, useCallback, useEffect, forwardRef } from 'react';

import Image from 'next/image';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  className?: string;
  containerClassName?: string;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
  aspectRatio?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  decoding?: 'async' | 'sync' | 'auto';
}

interface ImagePlaceholderProps {
  width?: number;
  height?: number;
  className?: string;
  aspectRatio?: string;
}

// ============================================================================
// Image Placeholder Component
// ============================================================================

function ImagePlaceholder({ width, height, className, aspectRatio }: ImagePlaceholderProps) {
  return (
    <div
      className={cn('animate-pulse bg-gray-200 rounded-md', className)}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%',
        aspectRatio: aspectRatio,
      }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// Optimized Image Component
// ============================================================================

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  function OptimizedImage(
    {
      src,
      alt,
      width,
      height,
      fill = false,
      priority = false,
      loading = 'lazy',
      className,
      containerClassName,
      placeholder = 'empty',
      blurDataURL,
      sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      quality = 80,
      format = 'auto',
      onLoad,
      onError,
      fallbackSrc = '/logos/owl-logo.svg',
      aspectRatio,
      objectFit = 'cover',
      objectPosition = 'center',
      decoding = 'async',
    },
    ref
  ) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);

    // Reset state when src changes
    useEffect(() => {
      setCurrentSrc(src);
      setHasError(false);
      setIsLoading(true);
    }, [src]);

    const handleLoad = useCallback(() => {
      setIsLoading(false);
      onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(() => {
      setHasError(true);
      setIsLoading(false);

      // Try fallback if available and not already using it
      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      }

      onError?.();
    }, [fallbackSrc, currentSrc, onError]);

    // Generate src with format if specified
    const getOptimizedSrc = useCallback(() => {
      if (format === 'auto' || currentSrc.startsWith('data:')) {
        return currentSrc;
      }

      // Add format query parameter for image optimization services
      const separator = currentSrc.includes('?') ? '&' : '?';
      return `${currentSrc}${separator}format=${format}`;
    }, [currentSrc, format]);

    const imageSrc = getOptimizedSrc();

    return (
      <div
        className={cn('relative overflow-hidden', fill && 'absolute inset-0', containerClassName)}
        style={{
          aspectRatio: !fill ? aspectRatio : undefined,
        }}
      >
        {/* Loading Placeholder */}
        {isLoading && !priority && (
          <ImagePlaceholder
            width={width}
            height={height}
            aspectRatio={aspectRatio}
            className={cn('absolute inset-0', className)}
          />
        )}

        {/* Error State */}
        {hasError && currentSrc === fallbackSrc && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
            <span className="text-sm text-gray-400">Failed to load image</span>
          </div>
        )}

        {/* Main Image */}
        <Image
          ref={ref}
          src={imageSrc}
          alt={alt}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          priority={priority}
          loading={priority ? 'eager' : loading}
          className={cn(
            'transition-opacity duration-300',
            isLoading && !priority ? 'opacity-0' : 'opacity-100',
            className
          )}
          style={{
            objectFit,
            objectPosition,
          }}
          placeholder={placeholder}
          blurDataURL={blurDataURL}
          sizes={sizes}
          quality={quality}
          onLoad={handleLoad}
          onError={handleError}
          decoding={decoding}
        />
      </div>
    );
  }
);

// ============================================================================
// Lazy Image Component
// ============================================================================

interface LazyImageProps extends Omit<OptimizedImageProps, 'loading'> {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function LazyImage({
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  ...props
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (triggerOnce) {
              observer.disconnect();
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        },
        {
          threshold,
          rootMargin,
        }
      );

      observer.observe(node);

      return () => observer.disconnect();
    },
    [threshold, rootMargin, triggerOnce]
  );

  return (
    <div ref={containerRef} className="w-full h-full">
      {isInView ? (
        <OptimizedImage {...props} loading="lazy" />
      ) : (
        <ImagePlaceholder
          width={props.width}
          height={props.height}
          aspectRatio={props.aspectRatio}
          className={props.className}
        />
      )}
    </div>
  );
}

// ============================================================================
// Responsive Image Component
// ============================================================================

interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'width' | 'height' | 'fill'> {
  aspectRatio?: string;
  maxWidth?: number;
  breakpoints?: { width: number; size: string }[];
}

export function ResponsiveImage({
  aspectRatio = '16 / 9',
  maxWidth,
  breakpoints = [
    { width: 640, size: '100vw' },
    { width: 768, size: '50vw' },
    { width: 1024, size: '33vw' },
    { width: 1280, size: '25vw' },
  ],
  className,
  ...props
}: ResponsiveImageProps) {
  const sizes = breakpoints.map((bp) => `(max-width: ${bp.width}px) ${bp.size}`).join(', ');

  return (
    <div
      className={cn('relative w-full', className)}
      style={{
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
        aspectRatio,
      }}
    >
      <OptimizedImage {...props} fill sizes={sizes} className="object-cover" />
    </div>
  );
}

// ============================================================================
// Avatar Image Component
// ============================================================================

interface AvatarImageProps extends Omit<OptimizedImageProps, 'width' | 'height' | 'fill'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: React.ReactNode;
}

const avatarSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export function AvatarImage({ size = 'md', fallback, className, ...props }: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  const pixelSize = avatarSizes[size];

  if (hasError) {
    return (
      <div
        className={cn('flex items-center justify-center bg-gray-200 rounded-full', className)}
        style={{ width: pixelSize, height: pixelSize }}
      >
        {fallback || (
          <span className="text-xs font-medium text-gray-500">
            {props.alt?.charAt(0).toUpperCase() || '?'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn('relative rounded-full overflow-hidden', className)}
      style={{ width: pixelSize, height: pixelSize }}
    >
      <OptimizedImage
        {...props}
        width={pixelSize}
        height={pixelSize}
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// ============================================================================
// Background Image Component
// ============================================================================

interface BackgroundImageProps {
  src: string;
  alt: string;
  children?: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  priority?: boolean;
  parallax?: boolean;
  parallaxSpeed?: number;
}

export function BackgroundImage({
  src,
  alt,
  children,
  className,
  overlayClassName,
  priority = false,
  parallax = false,
  parallaxSpeed = 0.5,
}: BackgroundImageProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!parallax) return;

    const handleScroll = () => {
      const scrolled = window.scrollY;
      setOffset(scrolled * parallaxSpeed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [parallax, parallaxSpeed]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className="absolute inset-0"
        style={{
          transform: parallax ? `translateY(${offset}px)` : undefined,
          willChange: parallax ? 'transform' : undefined,
        }}
      >
        <OptimizedImage
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-cover"
          sizes="100vw"
        />
      </div>
      {overlayClassName && <div className={cn('absolute inset-0', overlayClassName)} />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// ============================================================================
// Export Types
// ============================================================================

export type {
  OptimizedImageProps,
  LazyImageProps,
  ResponsiveImageProps,
  AvatarImageProps,
  BackgroundImageProps,
};
