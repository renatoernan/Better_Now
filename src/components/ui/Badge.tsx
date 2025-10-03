import React from 'react';
import { cn } from '../../shared/utils/utils/cn';

/**
 * Componente Badge padronizado com diferentes variantes
 * Usado para status, tags e indicadores
 */
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'default' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'default',
  ...props
}) => {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
    outline: 'text-foreground border-border',
    success: 'border-transparent bg-green-500 text-white hover:bg-green-600',
    warning: 'border-transparent bg-yellow-500 text-white hover:bg-yellow-600',
    info: 'border-transparent bg-blue-500 text-white hover:bg-blue-600',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};

Badge.displayName = 'Badge';