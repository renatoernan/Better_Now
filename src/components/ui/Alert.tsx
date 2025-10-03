import React, { forwardRef } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../shared/utils/utils/cn';
import { Button } from './Button';

/**
 * Componente Alert padronizado com diferentes variantes
 * Suporta ícones automáticos e ação de fechar
 */
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', dismissible = false, onDismiss, children, ...props }, ref) => {
    const variants = {
      default: 'bg-background text-foreground border-border',
      destructive: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
      success: 'border-green-500/50 text-green-700 dark:border-green-500 [&>svg]:text-green-600',
      warning: 'border-yellow-500/50 text-yellow-700 dark:border-yellow-500 [&>svg]:text-yellow-600',
      info: 'border-blue-500/50 text-blue-700 dark:border-blue-500 [&>svg]:text-blue-600',
    };

    const getIcon = () => {
      switch (variant) {
        case 'destructive':
          return <AlertCircle className="h-4 w-4" />;
        case 'success':
          return <CheckCircle className="h-4 w-4" />;
        case 'warning':
          return <AlertTriangle className="h-4 w-4" />;
        case 'info':
          return <Info className="h-4 w-4" />;
        default:
          return <Info className="h-4 w-4" />;
      }
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
          variants[variant],
          className
        )}
        {...props}
      >
        {getIcon()}
        <div className="flex-1">
          {children}
        </div>
        {dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={onDismiss}
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const AlertTitle = forwardRef<HTMLParagraphElement, AlertTitleProps>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);

AlertTitle.displayName = 'AlertTitle';

interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const AlertDescription = forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
);

AlertDescription.displayName = 'AlertDescription';