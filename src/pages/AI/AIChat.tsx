/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Sparkles, Send, Copy, Check, 
  Trash2, ChevronDown, Paperclip
} from 'lucide-react';
import { DataManager, ChatMessage, Note } from '../../services/storage/DataManager';
import { handleGeminiSendMessage } from '../../services/ai/gemini/gemini';
import { cn } from '../../utils/cn';

export default function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'generating' | 'checking' | 'updating' | 'error'>('idle');
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedModel, setSelectedModel] = useState('Claude 3.5 Sonnet');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadData = useCallback(async () => {
    const [history, allNotes] = await Promise.all([
      DataManager.getChatHistory(),
      DataManager.getAllNotes()
    ]);
    setMessages(history);
    setNotes(allNotes.filter(n => !n.isTrashed));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    await handleGeminiSendMessage(
      input,
      messages,
      {
        setIsLoading,
        setAiStatus,
        setAiReason,
        setMessages,
        setStreamingMessage,
        setInput,
        loadHistory: loadData,
        loadNotes: () => {},
        loadTasks: () => {}
      } as any,
      []
    );
  };

  const handleClearChat = async () => {
    setMessages([]);
    await DataManager.clearChatHistory();
  };

  const handleCopy = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-[#181816] text-[#ECEBE6] font-sans selection:bg-[#D97757]/30">
      {/* Minimal Claude Header */}
      <header className="h-14 border-b border-[#2B2A27] bg-[#181816] px-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/main')}
            className="p-1.5 hover:bg-[#2B2A27] rounded-lg text-[#9B9990] hover:text-[#ECEBE6] transition-colors"
            title="Back to Notes"
          >
            <ArrowLeft size={18} />
          </button>
          
          {/* Claude Model Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#2B2A27] text-sm font-medium text-[#ECEBE6] transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-[#D97757]" />
              <span>{selectedModel}</span>
              <ChevronDown size={14} className="text-[#9B9990]" />
            </button>

            <AnimatePresence>
              {showModelPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute top-full left-0 mt-1 w-56 bg-[#22211F] border border-[#363430] rounded-xl shadow-xl p-1.5 z-50 space-y-1"
                >
                  {['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3 Haiku'].map((model) => (
                    <button
                      key={model}
                      onClick={() => {
                        setSelectedModel(model);
                        setShowModelPicker(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors",
                        selectedModel === model ? "bg-[#D97757]/20 text-[#D97757]" : "text-[#ECEBE6] hover:bg-[#2B2A27]"
                      )}
                    >
                      <span>{model}</span>
                      {selectedModel === model && <Check size={14} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            className="p-2 hover:bg-[#2B2A27] rounded-lg text-[#9B9990] hover:text-[#ECEBE6] transition-colors text-xs font-medium flex items-center gap-1.5"
            title="Clear Conversation"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </header>

      {/* Main Chat Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 my-auto py-20">
            <div className="w-12 h-12 bg-[#D97757]/10 text-[#D97757] rounded-2xl flex items-center justify-center border border-[#D97757]/20">
              <Sparkles size={24} />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="text-xl font-semibold text-[#ECEBE6]">Welcome back</h2>
              <p className="text-xs text-[#9B9990] leading-relaxed">
                How can Claude help you analyze notes, organize tasks, or brainstorm ideas today?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md pt-4">
              {[
                "Summarize recent workspace notes",
                "Draft an outline for new document",
                "Extract action items from text",
                "Brainstorm creative solutions"
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => { setInput(prompt); }}
                  className="p-3 bg-[#22211F] hover:bg-[#2B2A27] border border-[#2B2A27] rounded-xl text-left text-xs text-[#ECEBE6]/80 hover:text-[#ECEBE6] transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-4 p-4 rounded-2xl transition-all",
                msg.role === 'user' ? "bg-[#22211F]/60 ml-auto max-w-[85%]" : "bg-transparent max-w-full"
              )}
            >
              <div className="shrink-0">
                {msg.role === 'user' ? (
                  <div className="w-7 h-7 bg-[#363430] text-[#ECEBE6] rounded-full flex items-center justify-center font-bold text-xs">
                    U
                  </div>
                ) : (
                  <div className="w-7 h-7 bg-[#D97757] text-black rounded-full flex items-center justify-center font-black text-xs shadow-md shadow-[#D97757]/20">
                    C
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#9B9990]">
                    {msg.role === 'user' ? 'You' : 'Claude'}
                  </span>
                  <button
                    onClick={() => handleCopy(idx, msg.text)}
                    className="text-[#9B9990] hover:text-[#ECEBE6] transition-colors p-1"
                    title="Copy response"
                  >
                    {copiedIdx === idx ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>

                <div className="text-sm leading-relaxed text-[#ECEBE6] whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-4 p-4 max-w-full items-center">
            <div className="w-7 h-7 bg-[#D97757] text-black rounded-full flex items-center justify-center font-black text-xs animate-pulse">
              C
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#9B9990]">
              <span className="w-1.5 h-1.5 bg-[#D97757] rounded-full animate-ping" />
              Claude is thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Claude Input Dock */}
      <div className="p-4 bg-[#181816] border-t border-[#2B2A27] shrink-0">
        <div className="max-w-3xl mx-auto bg-[#22211F] border border-[#363430] focus-within:border-[#D97757]/60 rounded-2xl p-2.5 shadow-2xl transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Reply to Claude..."
            rows={1}
            className="w-full bg-transparent text-sm text-[#ECEBE6] placeholder-[#9B9990]/60 resize-none outline-none px-2 py-1 leading-relaxed font-sans min-h-[40px] max-h-[180px]"
          />

          <div className="flex items-center justify-between pt-2 px-1">
            <div className="flex items-center gap-1 text-[#9B9990]">
              <button 
                onClick={() => navigate('/search')}
                className="p-1.5 hover:bg-[#2B2A27] rounded-lg hover:text-[#ECEBE6] transition-colors"
                title="Attach Note Context"
              >
                <Paperclip size={16} />
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "p-2 rounded-xl transition-all flex items-center justify-center",
                input.trim() && !isLoading
                  ? "bg-[#D97757] text-black shadow-md shadow-[#D97757]/20 hover:bg-[#c56647] active:scale-95"
                  : "bg-[#2B2A27] text-[#9B9990]/40 cursor-not-allowed"
              )}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
