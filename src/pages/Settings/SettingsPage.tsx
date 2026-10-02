/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Cpu, 
  HardDrive, 
  Cloud, 
  History, 
  Trash2, 
  Palette, 
  User,
  Zap,
  AlertTriangle,
  Settings,
  ShieldAlert,
  Check,
  X
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { DataManager } from '../../services/storage/DataManager';
import { ConfirmDialog } from '../../components/modals/CustomDialogs';

const SettingsTile = ({ 
  icon: Icon, 
  title, 
  description, 
  onClick, 
  colorClasses = "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10",
  iconColor = "text-white/60"
}: { 
  icon: any, 
  title: string, 
  description: string, 
  onClick: () => void,
  colorClasses?: string,
  iconColor?: string
}) => (
  <motion.button
    whileHover={{ scale: 1.01 }}
    whileTap={{ scale: 0.99 }}
    onClick={onClick}
    className={cn(
      "p-6 rounded-[2rem] border flex flex-col text-left transition-all group relative overflow-hidden h-full shadow-lg",
      colorClasses
    )}
  >
    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
      <ChevronRight size={18} className="text-white/20" />
    </div>
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", "bg-white/5", iconColor)}>
      <Icon size={24} />
    </div>
    <div className="space-y-1">
      <h3 className="text-lg font-bold tracking-tight text-white/90">{title}</h3>
      <p className="text-[11px] text-white/30 leading-relaxed font-medium">{description}</p>
    </div>
  </motion.button>
);

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [showConfirm1, setShowConfirm1] = useState(false);
  const [showConfirm2, setShowConfirm2] = useState(false);

  const handleDeleteAppData = async () => {
    await DataManager.deleteAllData();
    window.location.reload();
  };

  const sections = [
    {
      label: "এআই এবং ইন্টেলিজেন্স",
      tiles: [
        {
          icon: Cpu,
          title: "এআই কনফিগারেশন",
          description: "এপিআই কী এবং মডেল কন্ট্রোল সেটআপ করুন।",
          path: "/ai/settings",
          iconColor: "text-purple-400"
        }
      ]
    },
    {
      label: "ডেটা এবং স্টোরেজ",
      tiles: [
        {
          icon: HardDrive,
          title: "ডেটা মনিটর",
          description: "স্টোরেজ ব্যবহার এবং ব্যাকআপ কন্ট্রোল চেক করুন।",
          path: "/data-monitor",
          iconColor: "text-orange-400"
        },
        {
          icon: History,
          title: "রিসেন্ট ব্যাকআপ",
          description: "আগের ব্যাকআপ পয়েন্টগুলো থেকে আপনার ডেটা রিস্টোর করুন।",
          path: "/recent-backups",
          iconColor: "text-teal-400"
        },
        {
          icon: Cloud,
          title: "ক্লাউড আর্কাইভ",
          description: "আপনার ডেটা ক্লাউডে সুরক্ষিতভাবে সংরক্ষণ ও সিঙ্ক করুন।",
          path: "/cloud-archive",
          iconColor: "text-blue-500"
        },
        {
          icon: Trash2,
          title: "রিসাইকেল বিন",
          description: "মুছে ফেলা কন্টেন্ট পুনরুদ্ধার করতে রিসাইকেল বিন চেক করুন।",
          path: "/recycle-bin",
          iconColor: "text-red-400"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans">
      <header className="px-6 py-6 md:px-12 flex items-center justify-between shrink-0 bg-[#0d0d0d]/80 backdrop-blur-2xl z-[100] border-b border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/main')} 
            className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all flex items-center justify-center active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
               <Zap size={12} className="text-purple-400 fill-purple-400" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">System Settings</span>
            </div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">
              মেইন <span className="text-purple-500">সেটিংস</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 md:p-12 max-w-7xl mx-auto w-full space-y-16 pb-12">
        {sections.map((section) => (
          <div key={section.label} className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="h-0.5 w-8 bg-purple-500/30 rounded-full" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">
                {section.label}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.tiles.map((tile: any) => (
                <SettingsTile
                  key={tile.title}
                  icon={tile.icon}
                  title={tile.title}
                  description={tile.description}
                  onClick={() => navigate(tile.path)}
                  iconColor={tile.iconColor}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Danger Zone */}
        <div className="space-y-8 pt-10">
           <div className="flex items-center gap-4 px-2">
              <div className="h-0.5 w-8 bg-red-500/30 rounded-full" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-red-500/40">
                বিপজ্জনক এলাকা (Danger Zone)
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <SettingsTile 
                  icon={AlertTriangle}
                  title="সমস্ত ডেটা মুছুন"
                  description="অ্যাপের সমস্ত নোট, সেটিংস এবং ফাইল চিরতরে মুছে ফেলুন এবং রিসেট করুন।"
                  onClick={() => setShowConfirm1(true)}
                  iconColor="text-red-500"
                  colorClasses="bg-red-500/[0.02] border-red-500/10 hover:bg-red-500/[0.05] hover:border-red-500/30 shadow-red-500/5 shadow-2xl"
               />
            </div>
        </div>
      </main>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showConfirm1}
        onClose={() => setShowConfirm1(false)}
        onConfirm={() => {
          setShowConfirm1(false);
          setShowConfirm2(true);
        }}
        title="ডেটা মুছুন (Step 1/2)"
        message="আপনি কি নিশ্চিত যে আপনি সমস্ত অ্যাপ ডেটা মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা সম্ভব হবে না।"
        confirmText="পরবর্তী ধাপ"
        cancelText="বাতিল"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showConfirm2}
        onClose={() => setShowConfirm2(false)}
        onConfirm={handleDeleteAppData}
        title="চূড়ান্ত নিশ্চিতকরণ (Step 2/2)"
        message="লকাল স্টোরেজ, ডাটাবেজ এবং সেটিংস সবকিছু চিরতরে মুছে যাবে। আপনি কি প্রস্তুত?"
        confirmText="সব মুছুন"
        cancelText="না, ফিরে যান"
        variant="danger"
      />
    </div>
  );
};

export default SettingsPage;
