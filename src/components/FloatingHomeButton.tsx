/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
