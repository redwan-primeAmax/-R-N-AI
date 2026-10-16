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

import React, { useState, useEffect } from 'react';
import { t as tr } from '../../utils/translator';
import Navigation2 from '../../components/Navigation2';
import { m as motion } from 'framer-motion';
import { 
  ChevronLeft, HardDrive, 
  Database, History as HistoryIcon,
  FileText, MessageSquare, Settings as SettingsIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataManager } from '../../services/storage/DataManager';
import LoadingScreen from '../../components/LoadingScreen';
import { formatSize } from '../../utils/formatSize';

export default function DataMonitor() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, usage] = await Promise.all([
        DataManager.getGarbageStats(),
        DataManager.getStorageUsage()
      ]);
      setStats(s);
      setStorageInfo(usage);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingScreen />;

  const usagePercent = storageInfo ? Math.min(100, (storageInfo.used / (storageInfo.quota || 1)) * 100) : 0;

  const usageItems = [
    { label: tr('data.notesPages'), size: stats?.notesSize, count: stats?.notesCount, icon: FileText, color: 'text-blue-400' },
    { label: tr('data.mediaImages'), size: stats?.mediaSize, count: stats?.mediaCount, icon: Database, color: 'text-purple-400' },
    { label: tr('data.versionsBackups'), size: stats?.versionsSize, count: stats?.versionsCount, icon: HistoryIcon, color: 'text-orange-400' },
    { label: tr('data.chatHistory'), size: stats?.chatSize, count: stats?.chatCount, icon: MessageSquare, color: 'text-emerald-400' },
    { label: tr('data.systemCache'), size: stats?.systemSize, icon: SettingsIcon, color: 'text-gray-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-32">
      <div className="-mx-6 -mt-6 mb-8"><Navigation2 backTo="/settings" /></div>

      <div className="max-w-2xl mx-auto space-y-8">
        {/* Total Usage Card */}
        <div className="p-8 bg-[#151516] rounded-[40px] border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[.2em] text-white/20">{tr('data.totalUsed')}</h4>
              <p className="text-4xl font-black text-blue-400 mt-1">{formatSize(storageInfo?.used || 0)}</p>
            </div>
            <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 shadow-inner">
              <HardDrive size={32} />
            </div>
          </div>
          
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${usagePercent}%` }}
              className="h-full bg-blue-500 rounded-full"
            />
          </div>

          <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center">
            Quota: {formatSize(storageInfo?.quota || 0)}
          </p>
        </div>

        {/* Breakdown List */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 px-2">Detailed Breakdown</h3>
          <div className="grid grid-cols-1 gap-3">
            {usageItems.map((item, idx) => (
              <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-3xl p-5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white/90">{item.label}</p>
                    {item.count !== undefined && (
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-0.5">{item.count} items</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-white/60">{formatSize(item.size || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
