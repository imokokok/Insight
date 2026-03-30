'use client';

import { useState, useCallback, useEffect, forwardRef } from 'react';

import Image from 'next/image';

import { cn } from '@/lib/utils';

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

      if (fallbackSrc && currentSrc !== fallbackSrc) {
        setCurrentSrc(fallbackSrc);
      }

      onError?.();
    }, [fallbackSrc, currentSrc, onError]);

    const getOptimizedSrc = useCallback(() => {
      if (format === 'auto' || currentSrc.startsWith('data:')) {
        return currentSrc;
      }

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
        {isLoading && !priority && (
          <ImagePlaceholder
            width={width}
            height={height}
            aspectRatio={aspectRatio}
            className={cn('absolute inset-0', className)}
          />
        )}

        {hasError && currentSrc === fallbackSrc && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
            <span className="text-sm text-gray-400">Failed to load image</span>
          </div>
        )}

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

export type { OptimizedImageProps };
