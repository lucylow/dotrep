import { useState, useRef, useEffect } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  className?: string;
  containerClassName?: string;
}

/**
 * Lazy-loaded image component with intersection observer
 * Only loads the image when it enters the viewport
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  fallback,
  className,
  containerClassName,
  ...props
}: LazyImageProps) {
  const [imageRef, isIntersecting] = useIntersectionObserver<HTMLImageElement>({
    threshold: 0.1,
    triggerOnce: true,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | undefined>(
    placeholder || undefined
  );

  useEffect(() => {
    if (isIntersecting && !isLoaded && !hasError) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        if (fallback) {
          setImageSrc(fallback);
        } else {
          setHasError(true);
        }
      };
      img.src = src;
    }
  }, [isIntersecting, src, fallback, isLoaded, hasError]);

  if (hasError && !fallback) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          className
        )}
        aria-label={alt}
      >
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', containerClassName)}>
      {!isLoaded && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-muted',
            className
          )}
          aria-hidden="true"
        >
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          )}
        </div>
      )}
      <img
        ref={imageRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading="lazy"
        {...props}
      />
    </div>
  );
}

