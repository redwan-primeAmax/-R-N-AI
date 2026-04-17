/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0A0A] flex flex-col items-center justify-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center"
      >
        <div className="relative w-24 h-24 mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-t-2 border-blue-500 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          </div>
        </div>
        
        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">
          Redwan Assistant
        </p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
