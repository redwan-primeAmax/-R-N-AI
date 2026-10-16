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

import React, { useEffect, useState } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { useLanguage } from '../utils/translator';

const APP_VERSION = `1.0.5-${__BUILD_HASH__}`; // Problem 15: Use build hash for precise versioning

const VersionControl: React.FC = () => {
  const { t } = useLanguage();
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion && savedVersion !== APP_VERSION) {
      setShowUpdate(true);
    }
    localStorage.setItem('app_version', APP_VERSION);
  }, []);

  const handleUpdate = () => {
    // Clear caches if needed
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-6 right-6 z-[200] md:left-auto md:w-96"
        >
          <div className="bg-[#1c1c1c] border border-blue-500/30 p-5 rounded-[24px] shadow-2xl backdrop-blur-xl">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0">
                <RefreshCw size={24} className="text-blue-500 animate-spin-slow" />
              </div>
              <div className="flex-grow">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-sm text-white">{t('update.title')}</h3>
                  <button onClick={() => setShowUpdate(false)} className="text-white/20 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-white/40 text-[11px] leading-relaxed mb-4">
                  {t('update.desc')}
                </p>
                <button
                  onClick={handleUpdate}
                  className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  {t('update.cta')}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VersionControl;
