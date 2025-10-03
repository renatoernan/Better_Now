import React, { forwardRef } from 'react';
import { cn } from '../../shared/utils/utils/cn';
import type { InputProps } from '../../shared/types';

/**
 * Componente Input padronizado com variantes e estados
 * Suporta todas as props nativas de input HTML
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text',
    variant = 'default',
    size = 'default',
    error,
    success,
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    
    const variants = {
      default: 'border-input',
      ghost: 'border-transparent bg-transparent',
    };

    const sizes = {
      default: 'h-10 px-3 py-2',
      sm: 'h-9 px-3 py-2 text-xs',
      lg: 'h-11 px-4 py-3',
    };

    const states = {
      error: 'border-red-500 focus-visible:ring-red-500',
      success: 'border-green-500 focus-visible:ring-green-500',
    };

    const getStateStyles = () => {
      if (error) return states.error;
      if (success) return states.success;
      return '';
    };

    return (
      <input
        type={type}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          getStateStyles(),
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';