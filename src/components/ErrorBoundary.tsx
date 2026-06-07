import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, ChevronRight, Bug, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleCopyError = async () => {
    const errorText = `Error Message: ${this.state.error?.message || 'Unknown error'}\n\nStack Trace:\n${this.state.error?.stack || 'No stack trace available'}`;
    try {
      await navigator.clipboard.writeText(errorText);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch (err) {
      console.error('Failed to copy error details', err);
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.inline) {
        return (
          <div className="flex flex-col items-center justify-center p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-center">
            <AlertCircle size={24} className="text-red-500 mb-2" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Component Error</h4>
            <p className="text-[10px] text-white/40 mb-3 truncate max-w-xs">{this.state.error?.message}</p>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-3 py-1 bg-red-500/10 hover:bg-neutral-800 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-red-500/20"
            >
              Retry
            </button>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white p-6 text-center select-none">
          <div className="w-24 h-24 bg-red-500/10 rounded-[40px] flex items-center justify-center text-red-500 mb-8 border border-red-500/20">
            <AlertCircle size={48} strokeWidth={1.5} />
          </div>
          
          <h1 className="text-3xl font-black tracking-tight mb-2">সমস্যা হয়েছে</h1>
          <p className="text-[10px] text-white/40 uppercase font-black tracking-[0.2em] mb-6">Something went wrong</p>
          
          <div className="bg-white/5 border border-white/5 rounded-[32px] p-8 mb-8 max-w-lg w-full">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/[0.03]">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-red-500/80">ত্রুটি সনাক্তকরণ (Error Log)</span>
              
              <button
                onClick={this.handleCopyError}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 text-white/60 hover:text-white rounded-xl text-[10px] font-bold transition-all border border-white/[0.05] cursor-pointer"
              >
                {this.state.copied ? (
                  <>
                    <Check size={11} className="text-green-500 animate-pulse" />
                    <span className="text-green-500">কপি হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>কপি করুন</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-white/70 leading-relaxed font-semibold mb-6 text-left select-text selection:bg-red-500/20">
              {this.state.error?.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।'}
            </p>
            
            <div className="mt-4 text-left border-t border-white/[0.03] pt-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all cursor-pointer"
                >
                  <ChevronRight size={14} className={`transition-transform ${this.state.showDetails ? 'rotate-90' : ''}`} />
                  ত্রুটির বিবরণ দেখুন (Error Details)
                </button>
                
                <button
                  onClick={this.handleCopyError}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border border-red-500/15 cursor-pointer"
                >
                  {this.state.copied ? 'কপি হয়েছে' : 'ত্রুটি কপি করুন (Copy)'}
                </button>
              </div>
              
              {this.state.showDetails && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-4 bg-black/40 rounded-2xl border border-white/5 text-[10px] font-mono text-white/30 overflow-auto max-h-[220px] select-text"
                >
                  <div className="flex items-center gap-2 mb-2 text-red-500/50">
                    <Bug size={11} />
                    <span>STACK TRACE</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-mono break-all text-left">
                    {this.state.error?.stack || 'No stack trace found.'}
                  </pre>
                </motion.div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-8 py-5 bg-white text-black font-black uppercase tracking-widest rounded-[24px] hover:bg-white/90 transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-white/5"
            >
              <RotateCcw size={18} />
              আবার লোড করুন
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-8 py-5 bg-white/5 text-white/60 font-black uppercase tracking-widest rounded-[24px] hover:bg-white/10 transition-all active:scale-95 border border-white/5"
            >
              হোমে ফিরুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
