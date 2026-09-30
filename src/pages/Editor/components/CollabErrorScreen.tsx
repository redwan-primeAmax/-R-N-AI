/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CollabErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export const CollabErrorScreen: React.FC<CollabErrorScreenProps> = ({
  message,
  onRetry
}) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[2000] bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-sm space-y-6"
      >
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto text-red-500 border border-red-500/20">
          <AlertCircle size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Join Failed</h2>
          <p className="text-sm text-white/50 leading-relaxed">
            {message || "We couldn't connect to the live session. The host might be offline or the link has expired."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="w-full bg-white text-black py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/90 active:scale-95 transition-all"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          
          <button
            onClick={() => navigate('/main')}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 transition-all"
          >
            <ArrowLeft size={16} />
            Go to My Notes
          </button>
        </div>
      </motion.div>
    </div>
  );
};
