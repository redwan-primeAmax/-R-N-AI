/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function FloatingHomeButton() {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.85 }}
      whileHover={{ scale: 1.1 }}
      onClick={() => navigate('/main')}
      className="fixed bottom-8 right-6 z-[60] w-14 h-14 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl shadow-black/40 active:scale-90 transition-colors"
      aria-label="Go to Home"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M3 9.5L12 3L21 9.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V9.5Z"
          fill="black"
          stroke="black"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}
