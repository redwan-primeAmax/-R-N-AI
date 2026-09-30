/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { ConnectionState } from '../../../services/collab';

interface CollabStatusBarProps {
  state: ConnectionState;
}

export const CollabStatusBar: React.FC<CollabStatusBarProps> = ({ state }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state === 'connecting' || state === 'reconnecting' || state === 'error') {
      setVisible(true);
    } else if (state === 'connected') {
      const timer = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [state]);

  if (!visible) return null;

  const getConfig = () => {
    switch (state) {
      case 'connecting':
        return { icon: <Loader2 className="animate-spin" />, text: 'Connecting to live session...', color: 'bg-amber-500' };
      case 'reconnecting':
        return { icon: <RefreshCw className="animate-spin" />, text: 'Connection lost. Reconnecting...', color: 'bg-amber-500' };
      case 'error':
        return { icon: <AlertCircle />, text: 'Connection error. Check your internet.', color: 'bg-red-500' };
      case 'connected':
        return { icon: null, text: 'Connected!', color: 'bg-green-500' };
      default:
        return null;
    }
  };

  const config = getConfig();
  if (!config) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={`fixed top-0 left-0 right-0 z-[1000] ${config.color} text-black py-1 px-4 flex items-center justify-center gap-2 text-[11px] font-bold shadow-lg`}
      >
        {config.icon && React.cloneElement(config.icon as React.ReactElement, { size: 14 })}
        <span>{config.text}</span>
      </motion.div>
    </AnimatePresence>
  );
};
