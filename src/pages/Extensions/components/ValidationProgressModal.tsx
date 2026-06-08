
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Loader2, CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import { ValidationResult, ValidationIssue } from '../../../services/ExtensionValidator';

interface ValidationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ValidationResult | null;
  isValidating: boolean;
}

export function ValidationProgressModal({ isOpen, onClose, result, isValidating }: ValidationProgressModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    'স্ট্রাকচার চেক করা হচ্ছে...',
    'সেন্ট্যাক্স ভ্যালিডেশন...',
    'সিকিউরিটি অ্যানালাইসিস...',
    'রেজাল্ট জেনারেট হচ্ছে...'
  ];

  useEffect(() => {
    if (isValidating) {
      setCurrentStep(0);
      const interval = setInterval(() => {
        setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isValidating]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="relative w-full max-w-lg bg-[#0d0d0d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">ভ্যালিডেটর</h3>
                  <p className="text-sm text-white/40">অ্যালগরিদমিক এক্সটেনশন অডিট</p>
                </div>
              </div>
              {!isValidating && (
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40">
                  <span className="sr-only">Close</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6 min-h-[300px]">
              {isValidating ? (
                <div className="flex flex-col items-center justify-center h-full py-10">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
                    <motion.div 
                      className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <h4 className="text-lg font-medium mt-8 text-white/80">{steps[currentStep]}</h4>
                  <div className="w-48 h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                    <motion.div 
                      className="h-full bg-orange-500"
                      initial={{ width: '0%' }}
                      animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className={`p-4 rounded-2xl border flex items-center gap-4 ${result.isValid ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    {result.isValid ? (
                      <CheckCircle2 className="w-10 h-10 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-10 h-10 text-red-500 shrink-0" />
                    )}
                    <div>
                      <h4 className={`text-lg font-bold ${result.isValid ? 'text-green-500' : 'text-red-500'}`}>
                        {result.isValid ? 'সফলভাবে ভ্যালিডেট হয়েছে' : 'ভ্যালিডেশনে সমস্যা পাওয়া গেছে'}
                      </h4>
                      <p className="text-white/60 text-sm">
                        মোট {result.issues.length}টি ইস্যু পাওয়া গেছে। এক্সটেনশন রান করার আগে এগুলো চেক করুন।
                      </p>
                    </div>
                  </div>

                  {/* Issues List */}
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {result.issues.length === 0 ? (
                      <div className="text-center py-10 text-white/30 italic">
                        কোন সমস্যা পাওয়া যায়নি
                      </div>
                    ) : (
                      result.issues.map((issue, i) => (
                        <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/5 flex gap-3 items-start">
                          <IssueIcon type={issue.type} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold uppercase tracking-wider ${issue.type === 'error' ? 'text-red-400' : issue.type === 'warning' ? 'text-orange-400' : 'text-blue-400'}`}>
                                {issue.type}
                              </span>
                              {issue.line && (
                                <span className="text-[10px] text-white/20 font-mono">Line {issue.line}</span>
                              )}
                            </div>
                            <p className="text-sm text-white/80 mt-1">{issue.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white/5 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-sm font-bold transition-all"
              >
                বন্ধ করুন
              </button>
              {result?.isValid && (
                <button
                  className="px-8 py-3 bg-orange-500 hover:bg-orange-600 rounded-2xl text-sm font-bold text-black transition-all"
                  onClick={onClose}
                >
                  ঠিক আছে
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function IssueIcon({ type }: { type: ValidationIssue['type'] }) {
  switch (type) {
    case 'error': return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
    case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />;
    default: return <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />;
  }
}
