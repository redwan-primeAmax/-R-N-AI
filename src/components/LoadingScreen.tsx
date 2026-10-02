/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-8 w-full h-full">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-6 h-6 border-2 border-white/10 border-t-blue-500 rounded-full"
      />
    </div>
  );
};

export default LoadingScreen;
