/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Cpu, 
  Database, 
  Shield, 
  Palette, 
  Sparkles, 
  Trash2, 
  HardDrive, 
  Cloud, 
  History, 
  Lock,
  User,
  Zap
} from 'lucide-react';
import { cn } from '../../utils/cn';

const SettingsTile = ({ 
  icon: Icon, 
  title, 
  description, 
  onClick, 
  colorClasses = "bg-white/5 border-white/5",
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
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "p-6 rounded-[2.5rem] border flex flex-col text-left transition-all group relative overflow-hidden",
      colorClasses
    )}
  >
    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
      <ChevronRight size={20} className="text-white/20" />
    </div>
    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", "bg-white/5", iconColor)}>
      <Icon size={24} />
    </div>
    <div className="space-y-1">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="text-xs text-white/40 leading-relaxed">{description}</p>
    </div>
  </motion.button>
);

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      label: "এআই এবং ইন্টেলিজেন্স",
      tiles: [
        {
          icon: Cpu,
          title: "এআই কনফিগারেশন",
          description: "এপিআই কী, মডেল এবং ব্যাকগ্রাউন্ড অটোমেশন কন্ট্রোল",
          path: "/ai/settings",
          iconColor: "text-purple-400"
        },
        {
          icon: Sparkles,
          title: "কন্টেন্ট আর্কিটেক্ট",
          description: "এআই ব্যবহার করে অটোমেটিক কন্টেন্ট জেনারেশন সেটিংস",
          path: "/external-ai-import",
          iconColor: "text-blue-400"
        }
      ]
    },
    {
      label: "ডেটা এবং স্টোরেজ",
      tiles: [
        {
          icon: HardDrive,
          title: "স্টোরেজ অপ্টিমাইজার",
          description: "মিডিয়া ফাইল ক্লিনআপ এবং ডাটা ব্যাকআপ",
          path: "/storage-optimizer",
          iconColor: "text-orange-400"
        },
        {
          icon: Cloud,
          title: "ক্লাউড আর্কাইভ",
          description: "আপনার ডেটা ক্লাউডে সুরক্ষিতভাবে সংরক্ষণ করুন",
          path: "/cloud-archive",
          iconColor: "text-blue-500"
        },
        {
          icon: History,
          title: "রিসেন্ট ব্যাকআপ",
          description: "আগের ব্যাকআপ পয়েন্টগুলো থেকে রিস্টোর করুন",
          path: "/recent-backups",
          iconColor: "text-teal-400"
        },
        {
          icon: Trash2,
          title: "রিসাইকেল বিন",
          description: "মুছে ফেলা কন্টেন্ট পুনরুদ্ধার করুন",
          path: "/recycle-bin",
          iconColor: "text-red-400"
        }
      ]
    },
    {
      label: "সুরক্ষা এবং সিস্টেম",
      tiles: [
        {
          icon: Shield,
          title: "নেটওয়ার্ক শিল্ড",
          description: "ব্রাউজার সিকিউরিটি এবং প্রাইভেসি কন্ট্রোল",
          path: "/network-shield",
          iconColor: "text-emerald-400"
        },
        {
          icon: Lock,
          title: "প্রাইভেসি এবং ভল্ট",
          description: "পাসওয়ার্ড ম্যানেজমেন্ট এবং সুরক্ষিত ভল্ট",
          path: "/ai/settings", // We'll link to specific section or handle in general settings
          iconColor: "text-amber-400"
        }
      ]
    },
    {
      label: "পার্সোনালাইজেশন",
      tiles: [
        {
          icon: Palette,
          title: "ইন্টারফেস সেটিংস",
          description: "থিম, এনিমেশন এবং ভিজ্যুয়াল পছন্দসমূহ",
          path: "/ai/settings",
          iconColor: "text-pink-400"
        },
        {
          icon: User,
          title: "ইউজার প্রোফাইল",
          description: "আপনার নাম এবং অ্যাপ রিস্টার্ট সেটআপ",
          path: "/ai/settings",
          iconColor: "text-indigo-400"
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] pointer-events-none -translate-y-1/2" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] pointer-events-none translate-y-1/2" />

      <header className="px-6 py-8 md:px-12 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/80 backdrop-blur-2xl z-[100] border-b border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/main')} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white border border-white/5 active:scale-95"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Zap size={14} className="text-purple-400 fill-purple-400" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">System Control</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              মেইন <span className="text-purple-500">সেটিংস</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-16 pb-32">
        {sections.map((section, sIdx) => (
          <div key={section.label} className="space-y-8">
            <div className="flex items-center gap-4 px-2">
              <div className="h-0.5 w-8 bg-purple-500/30 rounded-full" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">
                {section.label}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {section.tiles.map((tile, tIdx) => (
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
      </main>

      <footer className="px-6 py-12 border-t border-white/5 bg-white/[0.02] flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">System Version 3.5.0 Stable</span>
        </div>
        <p className="text-[10px] text-white/10 font-bold uppercase tracking-widest">Designed for Professional Optimization</p>
      </footer>
    </div>
  );
};

export default SettingsPage;
