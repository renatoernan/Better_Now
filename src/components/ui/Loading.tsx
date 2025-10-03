import React from 'react';
import { cn } from '../../shared/utils/utils/cn';
import type { LoadingProps } from '../../shared/types';

/**
 * Componente Loading padronizado com diferentes variantes
 * Suporta spinner, skeleton e texto personalizado
 */
export const Loading: React.FC<LoadingProps> = ({
  variant = 'spinner',
  size = 'default',
  text,
  className,
  fullScreen = false,
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const Spinner = () => (
    <svg
      className={cn('animate-spin', sizes[size])}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  const Dots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'rounded-full bg-current animate-pulse',
            size === 'sm' ? 'h-1 w-1' : 
            size === 'lg' ? 'h-3 w-3' :
            size === 'xl' ? 'h-4 w-4' : 'h-2 w-2'
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );

  const Pulse = () => (
    <div
      className={cn(
        'rounded-full bg-current animate-pulse',
        sizes[size]
      )}
    />
  );

  const Skeleton = () => (
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return <Dots />;
      case 'pulse':
        return <Pulse />;
      case 'skeleton':
        return <Skeleton />;
      default:
        return <Spinner />;
    }
  };

  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-2',
        fullScreen && 'fixed inset-0 bg-background/80 backdrop-blur-sm z-50',
        className
      )}
      role="status"
      aria-label={text || 'Carregando...'}
    >
      {renderVariant()}
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {text}
        </p>
      )}
    </div>
  );

  return content;
};

Loading.displayName = 'Loading';

export default Loading;