/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Clock, Plus, Send, Settings, Sparkles, User, Bot, Trash2, ChevronLeft, Download, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, Note, AITask, ContextSummary } from '../../../utils/DataManager';

interface InterfaceProps {
  messages: ChatMessage[];
  streamingMessage: string | null;
  isLoading: boolean;
  aiStatus: 'idle' | 'generating' | 'checking' | 'updating';
  aiReason: string | null;
  completionPercentage: number | null;
  notes: Note[];
  tasks: AITask[];
  contextSummary: ContextSummary | null;
  showClearConfirm: boolean;
  setShowClearConfirm: (show: boolean) => void;
  confirmClearHistory: () => void;
  resetAIMemory: () => void;
  exportChat: () => void;
  navigateBack: () => void;
  navigateToEditor: (id: string) => void;
  setInput: (val: string) => void;
  cleanAIText: (text: string) => string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  navigateToSettings: () => void;
  selectedModel: string;
}

/**
 * The main interface component for the AI Chat.
 * Handles the display of messages, tasks, and the header.
 */
export const AIInterface: React.FC<InterfaceProps> = ({
  messages,
  streamingMessage,
  isLoading,
  aiStatus,
  aiReason,
  completionPercentage,
  notes,
  tasks,
  contextSummary,
  showClearConfirm,
  setShowClearConfirm,
  confirmClearHistory,
  resetAIMemory,
  exportChat,
  navigateBack,
  navigateToEditor,
  setInput,
  cleanAIText,
  messagesEndRef,
  navigateToSettings,
  selectedModel
}) => {
  return (
    <>
      {/* Header */}
      <header className="px-6 py-3 flex justify-between items-center bg-[#0d0d0d] sticky top-0 z-30 border-b border-white/5">
        <button 
          onClick={navigateBack} 
          className="w-9 h-9 flex items-center justify-center bg-[#1a1a1a] rounded-full transition-all active:scale-95 text-white/80 hover:text-white shadow-sm"
        >
          <ChevronLeft size={20} />
        </button>
        
        <h1 className="font-semibold text-[17px] text-white tracking-tight">AI Assistant</h1>
        
        <button 
          onClick={navigateToSettings}
          className="w-9 h-9 flex items-center justify-center bg-[#1a1a1a] rounded-full transition-all active:scale-95 text-white/80 hover:text-white shadow-sm"
          title="AI সেটিংস"
        >
          <Settings size={20} />
        </button>
      </header>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#1c1c1c] border border-white/10 rounded-2xl p-6 w-full max-w-xs shadow-2xl"
            >
              <h3 className="text-lg font-bold text-white mb-2 text-center">চ্যাট ইতিহাস মুছবেন?</h3>
              <p className="text-white/40 text-sm mb-6 text-center">এটি এই চ্যাটের সব মেসেজ মুছে ফেলবে। এটি আর ফিরে পাওয়া যাবে না।</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-3 bg-white/5 text-white/60 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors"
                >
                  না
                </button>
                <button
                  onClick={confirmClearHistory}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
                >
                  হ্যাঁ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto px-4 py-6 space-y-8 no-scrollbar">
        {/* Active Tasks Section */}
        {tasks.filter(t => t.status === 'in-progress').length > 0 && (
          <div className="mb-8 space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Clock size={14} className="text-white/40" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">চলমান কাজ</span>
            </div>
            {tasks.filter(t => t.status === 'in-progress').map(task => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-white/90">{task.title}</h3>
                    <p className="text-[10px] text-white/40 mt-0.5">{task.description}</p>
                  </div>
                  <div className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-bold">
                    {task.parts.filter(p => p.status === 'completed').length}/{task.parts.length}
                  </div>
                </div>
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {task.parts.map(part => (
                    <div 
                      key={part.id}
                      className={(() => {
                        const base = "flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all";
                        if (part.status === 'completed') return `${base} bg-green-500/10 border-green-500/20 text-green-400`;
                        return `${base} bg-white/5 border-white/5 text-white/40`;
                      })()}
                    >
                      {part.status === 'completed' ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                      <span className="text-[10px] font-bold whitespace-nowrap">{part.title}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* AI Status Overlay - Simplified */}
        <AnimatePresence>
          {aiStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl">
                <div className="flex items-center gap-2">
                  {aiStatus === 'generating' ? (
                    <>
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">তৈরি হচ্ছে</span>
                    </>
                  ) : aiStatus === 'checking' ? (
                    <>
                      <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">যাচাই হচ্ছে</span>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                      <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">আপডেট হচ্ছে</span>
                    </>
                  )}
                </div>

                {completionPercentage !== null && completionPercentage > 0 && completionPercentage < 100 && (
                  <div className="flex items-center gap-2 pl-3 border-l border-white/10">
                    <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPercentage}%` }}
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      />
                    </div>
                    <span className="text-[9px] font-mono text-white/60">{completionPercentage}%</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="text-center py-16 space-y-12 relative">
            {/* Subtle radial glow behind the icon */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-white/[0.02] blur-[100px] rounded-full pointer-events-none" />
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-44 h-44 mx-auto flex flex-col items-center justify-center"
            >
              <Sparkles size={96} className="text-white relative z-10" />
              <span className="text-[38px] font-extrabold text-white relative z-10 mt-[-18px] tracking-tighter">AI</span>
            </motion.div>
            
            <div className="space-y-5 relative z-10">
              <h2 className="text-[52px] font-extrabold tracking-tight text-white px-6 leading-[1.05]">How can I help you today?</h2>
              <p className="text-white/30 text-[19px] max-w-[380px] mx-auto leading-snug font-medium">
                I can help you write, create ideas, and organize your space.
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-5 pt-6 relative z-10">
              {[
                { en: 'Create a to-do list', bn: 'একটি টু-ডু লিস্ট তৈরি করো' },
                { en: 'Summarize meeting notes', bn: 'মিটিং সামারি লেখো' },
                { en: 'Generate new ideas', bn: 'নতুন আইডিয়া দাও' }
              ].map(suggestion => (
                <button 
                  key={suggestion.en}
                  onClick={() => setInput(suggestion.bn)}
                  className="px-14 py-4.5 bg-[#222222] border border-white/10 rounded-full text-[19px] font-semibold text-white/90 hover:bg-[#2a2a2a] transition-all active:scale-[0.98] shadow-xl"
                >
                  {suggestion.en}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={(() => {
              const base = "flex gap-4";
              if (msg.role === 'user') return `${base} flex-row-reverse`;
              return `${base} flex-row`;
            })()}
          >
            <div className={(() => {
              const base = "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0";
              if (msg.role === 'user') return `${base} bg-white/10`;
              return `${base} bg-white text-black`;
            })()}
            >
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
              <div className={(() => {
                const base = "max-w-[85%] px-5 py-4 rounded-[24px] text-[16px] leading-relaxed relative group border";
                if (msg.role === 'user') return `${base} bg-[#333333] border-[#444444] text-white`;
                return `${base} bg-[#2a2a2a] border-[#3a3a3a] text-white`;
              })()}
              >
                {msg.role === 'model' && completionPercentage !== null && i === messages.length - 1 && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 bg-blue-600 text-white text-[9px] font-bold rounded-lg shadow-lg z-10">
                    {completionPercentage}% সম্পন্ন
                  </div>
                )}
                <div className="text-sm leading-relaxed prose prose-invert max-w-none markdown-body">
                  <ReactMarkdown>{msg.role === 'model' ? cleanAIText(msg.text) : msg.text}</ReactMarkdown>
                </div>
              
              {msg.role === 'model' && (msg.text.includes('<create_page>') || msg.text.includes('<update_page>') || msg.text.includes('<create_task>')) && (
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                  {(() => {
                    const extractTag = (tag: string, source: string) => {
                      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi');
                      const matches = [];
                      let match;
                      while ((match = regex.exec(source)) !== null) {
                        matches.push(match[1].trim());
                      }
                      return matches;
                    };

                    const extractNestedTag = (tag: string, source: string) => {
                      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
                      const match = regex.exec(source);
                      return match ? match[1].trim() : '';
                    };
                    
                    const buttons = [];
                    const text = msg.text;

                    // Create Page Matches
                    const createPages = extractTag('create_page', text);
                    for (const pageXml of createPages) {
                      const title = extractNestedTag('title', pageXml);
                      const rawId = extractNestedTag('id', pageXml);
                      const sanitizedId = rawId.replace(/[^a-z0-9-_]/gi, '_');
                      const targetNote = notes.find(n => n.id === sanitizedId || n.id === rawId || n.title.toLowerCase() === title.toLowerCase());
                      
                      if (targetNote) {
                        buttons.push(
                          <button 
                            key={`view-${targetNote.id}`}
                            onClick={() => navigateToEditor(targetNote.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:bg-white/90 transition-all shadow-lg"
                          >
                            <Plus size={14} />
                            পেজ দেখুন: {targetNote.title}
                          </button>
                        );
                      }
                    }

                    // Update Page Matches
                    const updatePages = extractTag('update_page', text);
                    for (const pageXml of updatePages) {
                      const idOrTitle = extractNestedTag('id', pageXml);
                      const sanitizedId = idOrTitle.replace(/[^a-z0-9-_]/gi, '_');
                      const targetNote = notes.find(n => n.id === sanitizedId || n.id === idOrTitle || n.title.toLowerCase() === idOrTitle.toLowerCase());
                      
                      if (targetNote) {
                        buttons.push(
                          <button 
                            key={`update-${targetNote.id}`}
                            onClick={() => navigateToEditor(targetNote.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-xs font-bold hover:bg-white/90 transition-all shadow-lg"
                          >
                            <Plus size={14} />
                            আপডেট দেখুন: {targetNote.title}
                          </button>
                        );
                      }
                    }

                    // Create Task Matches
                    const createTasks = extractTag('create_task', text);
                    for (const taskXml of createTasks) {
                      const title = extractNestedTag('title', taskXml);
                      buttons.push(
                        <div key={`task-${title}`} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl text-[10px] font-bold border border-blue-500/20">
                          <Clock size={12} />
                          টাস্ক তৈরি হয়েছে: {title}
                        </div>
                      );
                    }

                    return buttons;
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {(streamingMessage !== null || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black flex-shrink-0">
              <Bot size={16} />
            </div>
            <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-white/10 text-white/90">
              {streamingMessage ? (
                <div className="text-sm leading-relaxed prose prose-invert max-w-none markdown-body">
                  <ReactMarkdown>{cleanAIText(streamingMessage)}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-12" />
      </div>
    </>
  );
};
