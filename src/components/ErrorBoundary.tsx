import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#191919] text-white p-6 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Something went wrong</h1>
          <p className="text-white/60 mb-8 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
