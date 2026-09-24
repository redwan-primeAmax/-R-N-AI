import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export const OfflinePage = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-orange-500/10 text-orange-500 rounded-[32px] flex items-center justify-center mb-8"
      >
        <WifiOff size={48} />
      </motion.div>
      
      <h1 className="text-2xl font-black text-white mb-3">আপনি অফলাইনে আছেন</h1>
      <p className="text-white/40 text-sm max-w-xs mb-10 leading-relaxed">
        ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে। তবে চিন্তার কিছু নেই, আপনি আপনার আগের সংরক্ষিত নোটগুলো অফলাইনেই পড়তে এবং এডিট করতে পারবেন।
      </p>

      <button 
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-white/90 transition-all active:scale-95 shadow-xl"
      >
        <RefreshCw size={18} />
        আবার চেষ্টা করুন
      </button>

      <div className="mt-12 pt-12 border-t border-white/5 w-full max-w-xs">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Offline Ready Mode enabled</p>
      </div>
    </div>
  );
};
