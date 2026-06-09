import React, { useState, useRef } from 'react';
import { Upload, Box, Trash2, Play, ExternalLink } from 'lucide-react';
import { ToolManager, Tool } from '../../services/ToolManager';
import { motion, AnimatePresence } from 'framer-motion';
import ToolRunner from './ToolRunner';

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    const loadedTools = await ToolManager.getTools();
    setTools(loadedTools);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await ToolManager.uploadTool(file);
      await loadTools();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('আপনি কি এই টুলটি ডিলিট করতে চান?')) {
      await ToolManager.deleteTool(id);
      await loadTools();
    }
  };

  if (activeTool) {
    return <ToolRunner tool={activeTool} onClose={() => setActiveTool(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">টুলস লাইব্রেরি</h1>
            <p className="text-white/40 text-sm mt-1">আপনার কাস্টম টুলগুলো এখানে আপলোড এবং ম্যানেজ করুন</p>
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50"
          >
            <Upload size={18} />
            {isUploading ? 'আপলোড হচ্ছে...' : 'টুল আপলোড করুন (ZIP)'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".zip"
            className="hidden"
          />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {tools.map((tool) => (
              <motion.div
                key={tool.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group p-6 bg-[#151516] border border-white/[0.05] rounded-[32px] hover:border-purple-500/30 transition-all shadow-xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-2xl flex items-center justify-center">
                    <Box size={24} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTool(tool)}
                      className="p-2 bg-white/5 hover:bg-purple-500 text-white rounded-xl transition-colors"
                      title="Run Tool"
                    >
                      <Play size={18} fill="currentColor" />
                    </button>
                    <button
                      onClick={() => handleDelete(tool.id)}
                      className="p-2 bg-white/5 hover:bg-red-500 text-white rounded-xl transition-colors"
                      title="Delete Tool"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">{tool.name}</h3>
                <p className="text-xs text-white/30 uppercase tracking-widest font-black">
                  {Object.keys(tool.files).length} Files
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {tools.length === 0 && !isUploading && (
            <div className="col-span-full py-20 border-2 border-dashed border-white/[0.05] rounded-[40px] flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-white/5 text-white/10 rounded-full flex items-center justify-center mb-6">
                <Box size={40} />
              </div>
              <p className="text-white/40 font-bold">এখনো কোনো টুল আপলোড করা হয়নি</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 text-purple-400 hover:text-purple-300 text-sm font-bold"
              >
                প্রথম টুলটি আপলোড করুন
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
