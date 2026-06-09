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
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#121212] border border-white/5 rounded-[32px] p-8 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">দুঃখিত, কিছু ভুল হয়েছে</h1>
            <p className="text-white/40 mb-8 text-sm">
              অ্যাপ্লিকেশনটি একটি অপ্রত্যাশিত ত্রুটির সম্মুখীন হয়েছে। দয়া করে ফেজটি রিফ্রেশ করুন।
            </p>
            <div className="bg-black/20 rounded-xl p-3 mb-8 text-left overflow-auto max-h-32">
              <code className="text-[10px] text-red-400 font-mono">
                {this.state.error?.message}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all active:scale-95"
            >
              রিফ্রেশ করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
