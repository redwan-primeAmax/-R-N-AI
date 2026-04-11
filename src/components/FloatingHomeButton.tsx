/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from 'lucide-react';
import { motion } from 'motion/react';

export default function FloatingHomeButton() {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate('/main')}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-2xl shadow-white/10 active:scale-95 transition-all"
    >
      <Layout size={18} />
      <span>মূল পাতা</span>
    </motion.button>
  );
}
