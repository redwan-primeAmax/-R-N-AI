/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { m as motion } from 'framer-motion';

export default function FloatingHomeButton() {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate('/')}
      className="fixed bottom-8 right-8 z-[60] bg-white text-black w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-white/20 active:scale-95 transition-all border border-white/10"
    >
      <Home size={24} />
    </motion.button>
  );
}
