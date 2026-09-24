/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Wrench, Share2, 
  ArrowLeft, Download, Box, 
  Clock, Database, Layout
} from 'lucide-react';
import { cn } from '../../utils/cn';

export default function ToolsPage() {
  const navigate = useNavigate();

  const tools = [
    {
      title: 'AI Content Architect',
      description: 'ইম্পোর্ট ও কনটেন্ট অটোমেশন টুল',
      icon: <Sparkles className="w-6 h-6" />,
      path: '/external-ai-import',
      color: 'bg-blue-500'
    },
    {
      title: 'Storage Optimizer',
      description: 'স্টোরেজ পরিষ্কার ও অপ্টিমাইজ করুন',
      icon: <Database className="w-6 h-6" />,
      path: '/storage-optimizer',
      color: 'bg-amber-500'
    },
    {
      title: 'Backup & Restore',
      description: 'নোটস ব্যাকআপ ও রিকভারি',
      icon: <Clock className="w-6 h-6" />,
      path: '/recent-backups',
      color: 'bg-emerald-500'
    },
    {
      title: 'Templates',
      description: 'রেডিমেড পেজ টেমপ্লেটস',
      icon: <Layout className="w-6 h-6" />,
      path: '/template',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-6 pb-32">
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black tracking-tight">টুলস সেকশন</h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => navigate(tool.path)}
            className="group p-5 rounded-[2rem] bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all cursor-pointer relative overflow-hidden"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg",
              tool.color
            )}>
              {tool.icon}
            </div>
            <h3 className="text-lg font-bold mb-1 group-hover:text-amber-300 transition-colors">{tool.title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">{tool.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
