import React from 'react';
import { Button } from './Button';
import { clsx } from 'clsx';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content. Please try again.',
  onRetry,
  retryText = 'Try again',
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-8',
    lg: 'p-12',
  };

  const iconSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const titleSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center text-center', sizeClasses[size], className)}>
      <div className={clsx('mx-auto flex items-center justify-center rounded-full bg-red-100', iconSizeClasses[size])}>
        <svg
          className={clsx('text-red-600', size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8')}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      
      <h3 className={clsx('mt-4 font-semibold text-gray-900', titleSizeClasses[size])}>
        {title}
      </h3>
      
      <p className="mt-2 text-sm text-gray-600 max-w-sm">
        {message}
      </p>
      
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="primary"
          size={size === 'lg' ? 'lg' : 'md'}
          className="mt-6"
        >
          {retryText}
        </Button>
      )}
    </div>
  );
};

export interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data found',
  message = 'There is no data to display at the moment.',
  action,
  icon,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-8',
    lg: 'p-12',
  };

  const iconSizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const titleSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const defaultIcon = (
    <svg
      className={clsx('text-gray-400', size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8')}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="2"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  return (
    <div className={clsx('flex flex-col items-center justify-center text-center', sizeClasses[size], className)}>
      <div className={clsx('mx-auto flex items-center justify-center rounded-full bg-gray-100', iconSizeClasses[size])}>
        {icon || defaultIcon}
      </div>
      
      <h3 className={clsx('mt-4 font-semibold text-gray-900', titleSizeClasses[size])}>
        {title}
      </h3>
      
      <p className="mt-2 text-sm text-gray-600 max-w-sm">
        {message}
      </p>
      
      {action && (
        <Button
          onClick={action.onClick}
          variant="primary"
          size={size === 'lg' ? 'lg' : 'md'}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export { ErrorState, EmptyState };