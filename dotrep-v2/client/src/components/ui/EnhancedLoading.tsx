import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  animation?: 'pulse' | 'wave';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  animation = 'pulse',
}) => {
  const baseClasses = cn(
    'bg-gray-200 dark:bg-gray-700 rounded',
    animation === 'pulse' && 'animate-pulse',
    animation === 'wave' && 'relative overflow-hidden',
    variant === 'circular' && 'rounded-full',
    variant === 'rectangular' && 'rounded-lg',
    className
  );

  if (animation === 'wave') {
    return (
      <div className={baseClasses}>
        <div className="absolute inset-0 -translate-x-full animate-[wave_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent" />
      </div>
    );
  }

  return <div className={baseClasses} />;
};

export const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-center space-x-4 mb-4">
      <Skeleton variant="circular" className="w-12 h-12" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/6" />
    </div>
  </div>
);

export const ProgressiveImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}> = ({ src, alt, className, fallback = '/images/placeholder-avatar.png' }) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentSrc, setCurrentSrc] = React.useState(fallback);

  React.useEffect(() => {
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setCurrentSrc(fallback);
      setIsLoading(false);
    };
  }, [src, fallback]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse"
          />
        )}
      </AnimatePresence>
      
      <motion.img
        src={currentSrc}
        alt={alt}
        className={cn('w-full h-full object-cover', isLoading && 'opacity-0')}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />
    </div>
  );
};


