/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, SignalHigh, Sparkles } from 'lucide-react';

export const AndroidStatusBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format as 12-hour or 24-hour cleanly (e.g. "09:41" or "10:30")
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      setCurrentTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="w-full select-none z-50 sticky top-0 px-5 pt-2 pb-1.5 flex items-center justify-between text-[12px] font-semibold tracking-tight text-white/80 backdrop-blur-md bg-[var(--bg-main)]/90 border-b border-white/[0.04]"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      aria-hidden="true"
    >
      {/* Left side: Time and Notification Icon */}
      <div className="flex items-center gap-2">
        <span className="font-medium tracking-wide text-white/95 text-[12px]">{currentTime || '09:41'}</span>
        <div className="flex items-center gap-1 opacity-70">
          <Sparkles size={11} className="text-amber-400" />
        </div>
      </div>

      {/* Center Android Camera Punch Hole / Pill Sensor (subtle) */}
      <div className="hidden sm:block w-3.5 h-3.5 rounded-full bg-black/60 border border-white/10 shadow-inner" />

      {/* Right side: Signal, Wifi, Battery */}
      <div className="flex items-center gap-2 text-white/85 text-[11px]">
        <div className="flex items-center gap-1">
          <SignalHigh size={13} className="text-white/80" />
          <Wifi size={13} className="text-white/80" />
        </div>
        <div className="flex items-center gap-1 pl-0.5">
          <span className="text-[10px] font-mono text-white/70">88%</span>
          <BatteryMedium size={14} className="text-white/90 rotate-0" />
        </div>
      </div>
    </div>
  );
};

export default AndroidStatusBar;
