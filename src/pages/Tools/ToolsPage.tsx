/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Wrench, ArrowLeft, 
  Layout, Zap, Compass, ArrowRight
} from 'lucide-react';
import { cn } from '../../utils/cn';

export default function ToolsPage() {
  const navigate = useNavigate();

  const tools = [
    {
      title: 'AI Content Architect',
      description: 'অ্যাডভান্সড ইম্পোর্ট ও কনটেন্ট অটোমেশন টুল যা আপনার টেক্সটকে প্রফেশনাল লেআউটে সাজায়।',
      icon: <Sparkles className="w-6 h-6" />,
      path: '/external-ai-import',
      color: 'bg-blue-600',
      badge: 'Advanced'
    },
    {
      title: 'Page Templates',
      description: 'রেডিমেড পেজ টেমপ্লেটস যা দিয়ে আপনি মুহূর্তেই প্রফেশনাল ডকুমেন্ট তৈরি করতে পারবেন।',
      icon: <Layout className="w-6 h-6" />,
      path: '/template',
      color: 'bg-purple-600',
      badge: 'New'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col font-sans overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] pointer-events-none -translate-y-1/2 -translate-x-1/4" />
      
      <header className="px-6 py-8 md:px-12 flex items-center justify-between sticky top-0 bg-[#0d0d0d]/80 backdrop-blur-2xl z-[100] border-b border-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/main')}
            className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all active:scale-90"
            title="ফিরে যান"
          >
            <ArrowLeft size={24} className="text-white/80" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
               <Wrench size={12} className="text-blue-500" />
               <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Assistant Suite</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase leading-none">
              টুলস <span className="text-blue-500">সেকশন</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full space-y-12 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              onClick={() => navigate(tool.path)}
              className="group p-8 rounded-[3rem] bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-blue-500/30 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full shadow-2xl"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-8">
                <div className={cn(
                  "w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110 duration-500",
                  tool.color
                )}>
                  {tool.icon}
                </div>
                <span className="px-4 py-1.5 bg-white/5 rounded-full border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                  {tool.badge}
                </span>
              </div>

              {/* Card Body */}
              <div className="flex-1 space-y-4">
                <h3 className="text-2xl font-black tracking-tight group-hover:text-blue-400 transition-colors uppercase">{tool.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed font-medium">{tool.description}</p>
              </div>

              {/* Card Footer */}
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-white/20 group-hover:text-blue-400 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">Explore Tool</span>
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-2" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State / Coming Soon */}
        <div className="py-20 flex flex-col items-center text-center space-y-4 opacity-20 grayscale">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
            <Compass size={24} />
          </div>
          <div className="space-y-1">
             <h4 className="text-sm font-black uppercase tracking-widest">More Tools Coming Soon</h4>
             <p className="text-[10px] font-medium max-w-xs">আমরা আপনার প্রোডাক্টিভিটি বাড়াতে আরও নতুন ফিচার নিয়ে কাজ করছি।</p>
          </div>
        </div>
      </main>
    </div>
  );
}
