'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="qc-card max-w-md text-center">
            <div className="mb-3 text-4xl">⚠️</div>
            <h2 className="mb-2 text-lg font-semibold text-charcoal">
              Something went wrong
            </h2>
            <p className="mb-4 text-sm text-text-muted">
              {this.props.fallbackMessage ||
                'An unexpected error occurred. Please refresh the page.'}
            </p>
            {this.state.error && (
              <p className="mb-4 rounded-sm bg-gray-50 p-2 font-mono text-xs text-signal-red">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-lg bg-clinic-blue px-4 py-2 text-sm font-medium text-white hover:bg-clinic-blue-600 transition-colors"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}