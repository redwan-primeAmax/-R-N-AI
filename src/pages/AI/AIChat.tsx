/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Send, Copy, Check, 
  Trash2, ChevronDown, Paperclip, X, Loader2, Plus
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { DataManager, ChatMessage, Note, AISettings } from '../../services/storage/DataManager';
import { handleAgenticSendMessage } from '../../services/agent/agentic';
import { cn } from '../../utils/cn';

const TagSuggestion: React.FC<{
  noteId: string;
  tags: string[];
  onTagClick: (tag: string) => void;
  addedTags: string[];
}> = ({ tags, onTagClick, addedTags }) => {
  return (
    <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/5">
      <div className="w-full text-[10px] font-black uppercase tracking-widest text-[#9B9990] mb-1">
        Suggested Tags:
      </div>
      {tags.map(tag => {
        const isAdded = addedTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => !isAdded && onTagClick(tag)}
            disabled={isAdded}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
              isAdded 
                ? "bg-green-500/20 border-green-500/40 text-green-400 cursor-default" 
                : "bg-[#D97757]/10 border-[#D97757]/30 text-[#D97757] hover:bg-[#D97757]/20 active:scale-95"
            )}
          >
            {isAdded ? (
              <span className="flex items-center gap-1">
                <Check size={12} strokeWidth={3} /> {tag}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Plus size={12} strokeWidth={3} /> {tag}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * ModelPicker Component
 * Re-coded from scratch to solve the "2 bar span" (ghosting/double-trigger) bug.
 * Uses a rigid AnimatePresence setup with explicit portal-like fixed positioning 
 * and event isolation to prevent parent re-renders from causing UI glitches.
 */
const ModelPicker: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelect: (model: string) => void;
  anchorRect: DOMRect | null;
  models: string[];
}> = ({ isOpen, onClose, selectedModel, onSelect, anchorRect, models }) => {
  if (!anchorRect) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent Backdrop to capture all clicks and prevent ghosting */}
          <div 
            className="fixed inset-0 z-[100] cursor-default"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ 
              position: 'fixed',
              top: anchorRect.bottom + 8,
              left: Math.max(16, anchorRect.left),
              zIndex: 101 
            }}
            className="w-56 bg-[#22211F] border border-[#363430] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {models.length === 0 ? (
              <div className="px-3 py-2 text-[10px] text-white/30 font-bold uppercase tracking-widest text-center">No models configured</div>
            ) : models.map((model) => (
              <button
                key={model}
                onClick={() => {
                  onSelect(model);
                  onClose();
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-between transition-all",
                  selectedModel === model 
                    ? "bg-[#D97757]/20 text-[#D97757]" 
                    : "text-[#ECEBE6]/80 hover:bg-[#2B2A27] hover:text-[#ECEBE6]"
                )}
              >
                <span className="truncate">{model}</span>
                {selectedModel === model && <Check size={14} strokeWidth={3} />}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ChatMessageItem: React.FC<{
  msg: ChatMessage;
  idx: number;
  onCopy: (idx: number, text: string) => void;
  copiedIdx: number | null;
  notes: Note[];
  onAddTag: (noteId: string, tag: string) => void;
}> = ({ msg, idx, onCopy, copiedIdx, notes, onAddTag }) => {
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);
  const [addedTags, setAddedTags] = useState<string[]>([]);
  const isError = msg.text.toLowerCase().includes('error') || msg.text.toLowerCase().includes('failed');

  const renderMessageContent = (text: string) => {
    // 0. Extract tag suggestions
    const suggestTagsRegex = /<suggest_tags>([\s\S]*?)<\/suggest_tags>/i;
    const suggestMatch = suggestTagsRegex.exec(text);
    let suggestionData: { noteId: string; tags: string[] } | null = null;
    
    if (suggestMatch) {
      const xml = suggestMatch[1];
      const idMatch = /<id>([\s\S]*?)<\/id>/i.exec(xml);
      const tags: string[] = [];
      const tagRegex = /<tag>([\s\S]*?)<\/tag>/gi;
      let tMatch;
      while ((tMatch = tagRegex.exec(xml)) !== null) {
        tags.push(tMatch[1].trim());
      }
      if (idMatch) {
        suggestionData = { noteId: idMatch[1].trim(), tags };
      }
    }

    // 1. Suppress completion indicators
    let processedText = text.replace(/\[COMPLETION:\s*\d+%\]/gi, '').trim();

    // 2. Transform note IDs to titles in the visible text
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    processedText = processedText.replace(uuidRegex, (id) => {
      const note = notes.find(n => n.id === id);
      return note ? `"${note.title || 'শিরোনামহীন'}"` : id;
    });

    // 3. Identify if there are commands (even if unclosed)
    const hasCommand = /<(create_page|update_page|replace_content|suggest_tags|delete_page|search_workspace|list_notes|rag_query)/i.test(processedText);

    // 4. Strip command blocks cleanly. 
    const cleanText = processedText
      .replace(/<(create_page|update_page|replace_content|suggest_tags|delete_page|search_workspace|list_notes|rag_query)>[\s\S]*?<\/\1>/gi, '')
      .replace(/<(content|description|replacement|tags|query|filter|value)[\s\S]*?(<\/\1>|$)/gi, '')
      .replace(/<(\/)?(create_page|update_page|replace_content|suggest_tags|delete_page|title|emoji|id|search|part|tag|search_workspace|list_notes|rag_query)[^>]*>/gi, '')
      .trim();

    const isExecuting = msg.commandStatus === 'executing' || (idx === -1 && hasCommand);
    const isExecuted = msg.commandStatus === 'executed';

    if (!cleanText && hasCommand) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 py-3 px-4 bg-[#D97757]/10 border border-[#D97757]/30 rounded-2xl w-fit">
            {isExecuting ? (
              <>
                <Loader2 className="animate-spin text-[#D97757]" size={18} />
                <span className="text-xs font-black uppercase tracking-widest text-[#D97757]">Processing...</span>
              </>
            ) : isExecuted ? (
              <>
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="text-green-500" size={14} strokeWidth={4} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-green-500">Done</span>
              </>
            ) : (
              <>
                <Loader2 className="animate-spin text-[#D97757]" size={18} />
                <span className="text-xs font-black uppercase tracking-widest text-[#D97757]">Working...</span>
              </>
            )}
          </div>
          {suggestionData && (
            <TagSuggestion 
              noteId={suggestionData.noteId} 
              tags={suggestionData.tags} 
              addedTags={addedTags}
              onTagClick={(tag) => {
                setAddedTags(prev => [...prev, tag]);
                onAddTag(suggestionData!.noteId, tag);
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {cleanText && (
          <div 
            className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:rounded-2xl prose-headings:mb-2 prose-headings:mt-4 first:prose-headings:mt-0"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(cleanText, { gfm: true, breaks: true }) as string) }} 
          />
        )}
        {suggestionData && (
          <TagSuggestion 
            noteId={suggestionData.noteId} 
            tags={suggestionData.tags} 
            addedTags={addedTags}
            onTagClick={(tag) => {
              setAddedTags(prev => [...prev, tag]);
              onAddTag(suggestionData!.noteId, tag);
            }}
          />
        )}
        {hasCommand && (msg.commandStatus || idx === -1) && (
          <div className="flex items-center gap-2 pt-3 border-t border-white/5">
            {isExecuting ? (
              <>
                <Loader2 className="animate-spin text-[#D97757]/60" size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D97757]/60">Processing...</span>
              </>
            ) : isExecuted ? (
              <>
                <Check className="text-green-500/60" size={12} strokeWidth={4} />
                <span className="text-[10px] font-black uppercase tracking-widest text-green-500/60">Done</span>
              </>
            ) : (
              <>
                <Loader2 className="animate-spin text-[#D97757]/60" size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D97757]/60">Working...</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex gap-4 p-5 rounded-[24px] transition-all border border-transparent group",
        msg.role === 'user' 
          ? "bg-[#22211F] ml-auto max-w-[90%] sm:max-w-[80%] border-[#363430] shadow-sm" 
          : "bg-transparent max-w-full hover:bg-white/[0.02]"
      )}
    >
      <div className="shrink-0 pt-0.5">
        {msg.role === 'user' ? (
          <div className="w-8 h-8 bg-[#363430] text-[#ECEBE6] rounded-xl flex items-center justify-center font-black text-xs border border-white/5">
            U
          </div>
        ) : (
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-lg",
            isError ? "bg-red-500 text-white shadow-red-500/20" : "bg-[#D97757] text-black shadow-[#D97757]/20 border border-[#c56647]"
          )}>
            C
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#9B9990]">
            {msg.role === 'user' ? 'You' : 'Assistant'}
          </span>
          <button
            onClick={() => onCopy(idx, msg.text)}
            className="text-[#9B9990] hover:text-[#ECEBE6] transition-colors p-1.5 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            {copiedIdx === idx ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>

        <div className={cn(
          "text-[15px] leading-relaxed font-medium markdown-content",
          msg.role === 'user' ? "text-[#ECEBE6]/90 whitespace-pre-wrap" : isError ? "text-red-400 cursor-pointer" : "text-[#ECEBE6]/90"
        )}
          onClick={isError ? () => setIsErrorExpanded(!isErrorExpanded) : undefined}
        >
          {msg.role === 'user' ? (
            msg.text
          ) : renderMessageContent(msg.text)}

          {msg.attachedNotes && msg.attachedNotes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
              {msg.attachedNotes.map(n => (
                <div key={n.id} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg text-[10px] text-white/40">
                  <span>{n.emoji || '📝'}</span>
                  <span className="truncate max-w-[100px]">{n.title}</span>
                </div>
              ))}
            </div>
          )}
          
          {isError && isErrorExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[11px] font-bold text-red-300 uppercase tracking-widest">Full Error Trace</p>
              <code className="block text-[10px] bg-black/40 p-3 rounded-xl overflow-x-auto text-red-200/60 font-mono">
                {msg.debugInfo?.fullPrompt || msg.text}
              </code>
              <button 
                onClick={() => onCopy(idx, msg.debugInfo?.fullPrompt || msg.text)}
                className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Copy Full Error
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'generating' | 'checking' | 'updating' | 'error'>('idle');
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([]);
  const [pickerAnchor, setPickerAnchor] = useState<DOMRect | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelButtonRef = useRef<HTMLButtonElement>(null);

  const loadData = useCallback(async () => {
    const [history, allNotes, settings] = await Promise.all([
      DataManager.getChatHistory(),
      DataManager.getAllNotes(),
      DataManager.getAISettings()
    ]);
    setMessages(history);
    setNotes(allNotes.filter(n => !n.isTrashed));
    setAiSettings(settings);
    
    const provider = settings.selectedProvider;
    const models = settings.providerModels?.[provider] || [];
    setAvailableModels(models);
    
    const currentModel = settings.selectedModels[provider] || models[0] || '';
    setSelectedModel(currentModel);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingMessage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed && selectedNotes.length === 0) return;
    if (isLoading) return;

    if (!aiSettings || (!aiSettings.apiKeys[aiSettings.selectedProvider] && aiSettings.selectedProvider !== 'gemini')) {
      const errorMsg = `⚠️ এপিআই কী সেটআপ করা নেই!

আপনার নির্বাচন করা সার্ভিস (${aiSettings?.selectedProvider.toUpperCase()}) ব্যবহার করতে একটি এপিআই কী প্রয়োজন।

কিভাবে ঠিক করবেন:
১. 'Settings' এ যান।
২. 'AI Configuration' সিলেক্ট করুন।
৩. আপনার API Key প্রদান করে সেভ করুন।`;
      const msg: ChatMessage = { role: 'model', text: errorMsg, timestamp: Date.now() };
      setMessages(prev => [...prev, { role: 'user', text: input, timestamp: Date.now() }, msg]);
      return;
    }

    await handleAgenticSendMessage(
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
      selectedNotes
    );
    setSelectedNotes([]); // Clear attachments after sending
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

  const handleToggleModelPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (modelButtonRef.current) {
      setPickerAnchor(modelButtonRef.current.getBoundingClientRect());
    }
    setShowModelPicker(prev => !prev);
  };

  const toggleNoteSelection = (note: Note) => {
    setSelectedNotes(prev => 
      prev.find(n => n.id === note.id) 
        ? prev.filter(n => n.id !== note.id) 
        : [...prev, note]
    );
  };

  const handleSelectModel = async (model: string) => {
    if (!aiSettings) return;
    setSelectedModel(model);
    const updated = {
      ...aiSettings,
      selectedModels: {
        ...aiSettings.selectedModels,
        [aiSettings.selectedProvider]: model
      }
    };
    await DataManager.saveAISettings(updated);
    setAiSettings(updated);
  };

  const handleAddTag = async (noteId: string, tag: string) => {
    try {
      const note = await DataManager.getNoteById(noteId);
      if (note) {
        const currentTags = note.tags || [];
        if (!currentTags.includes(tag)) {
          await DataManager.updateNote(noteId, { tags: [...currentTags, tag] });
          window.dispatchEvent(new CustomEvent('app-notification', { 
            detail: { message: `ট্যাগ যোগ করা হয়েছে: ${tag}`, type: 'success' } 
          }));
        }
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#181816] text-[#ECEBE6] font-sans selection:bg-[#D97757]/30 overflow-hidden">
      {/* Note Selector Modal */}
      <AnimatePresence>
        {showNoteSelector && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNoteSelector(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#22211F] border border-[#363430] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[70vh]"
            >
              <div className="p-6 border-b border-[#363430] flex items-center justify-between">
                <h3 className="text-lg font-black text-[#ECEBE6]">নোট সিলেক্ট করুন</h3>
                <button 
                  onClick={() => setShowNoteSelector(false)}
                  className="p-2 hover:bg-[#363430] rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {notes.length === 0 ? (
                  <p className="text-center py-8 text-[#9B9990] text-sm">কোনো নোট পাওয়া যায়নি।</p>
                ) : (
                  notes.map(note => {
                    const isSelected = selectedNotes.find(n => n.id === note.id);
                    return (
                      <button
                        key={note.id}
                        onClick={() => toggleNoteSelection(note)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all border text-left",
                          isSelected 
                            ? "bg-[#D97757]/10 border-[#D97757]/50 text-[#D97757]" 
                            : "bg-[#2B2A27] border-transparent text-[#ECEBE6]/60 hover:border-[#363430] hover:text-[#ECEBE6]"
                        )}
                      >
                        <div className="w-10 h-10 bg-[#363430] rounded-xl flex items-center justify-center text-lg shrink-0">
                          {note.emoji || '📝'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{note.title || 'শিরোনামহীন'}</p>
                          <p className="text-[10px] opacity-40 uppercase font-black tracking-widest mt-0.5">Updated recently</p>
                        </div>
                        {isSelected && <Check size={18} strokeWidth={3} />}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-6 bg-[#181816] border-t border-[#363430]">
                <button
                  onClick={() => setShowNoteSelector(false)}
                  className="w-full py-4 bg-[#D97757] hover:bg-[#c56647] text-black font-black rounded-2xl transition-all active:scale-95 shadow-xl shadow-[#D97757]/20"
                >
                  সম্পন্ন করুন ({selectedNotes.length}টি নির্বাচিত)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Minimal Header */}
      <header className="h-14 border-b border-[#2B2A27] bg-[#181816] px-4 flex items-center justify-between z-[50] shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/main')}
            className="p-1.5 hover:bg-[#2B2A27] rounded-lg text-[#9B9990] hover:text-[#ECEBE6] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="relative">
            <button
              ref={modelButtonRef}
              onClick={handleToggleModelPicker}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-bold",
                showModelPicker ? "bg-[#2B2A27] text-[#ECEBE6]" : "hover:bg-[#2B2A27] text-[#ECEBE6]/80"
              )}
            >
              <div className="w-2 h-2 rounded-full bg-[#D97757] shadow-[0_0_8px_rgba(217,119,87,0.5)]" />
              <span>{selectedModel || 'Select Model'}</span>
              <ChevronDown size={14} className={cn("text-[#9B9990] transition-transform duration-200", showModelPicker && "rotate-180")} />
            </button>

            <ModelPicker 
              isOpen={showModelPicker}
              onClose={() => setShowModelPicker(false)}
              selectedModel={selectedModel}
              onSelect={handleSelectModel}
              anchorRect={pickerAnchor}
              models={availableModels}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            className="p-2 hover:bg-[#2B2A27] rounded-lg text-[#9B9990] hover:text-[#ECEBE6] transition-colors text-xs font-bold flex items-center gap-1.5"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full no-scrollbar scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 my-auto py-20 animate-in fade-in duration-700">
            <div className="w-16 h-16 bg-[#D97757]/10 text-[#D97757] rounded-[24px] flex items-center justify-center border border-[#D97757]/20 shadow-inner">
              <Sparkles size={32} />
            </div>
            <div className="space-y-2 max-w-md px-4">
              <h2 className="text-2xl font-black text-[#ECEBE6] tracking-tight">AI Assistant</h2>
              <p className="text-sm text-[#9B9990] leading-relaxed font-medium">
                How can Claude help you analyze notes, organize tasks, or brainstorm ideas today?
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg pt-4 px-2">
              {[
                "Summarize recent workspace notes",
                "Draft an outline for new document",
                "Extract action items from text",
                "Brainstorm creative solutions"
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => { setInput(prompt); }}
                  className="p-4 bg-[#22211F] hover:bg-[#2B2A27] border border-[#363430] hover:border-[#D97757]/30 rounded-2xl text-left text-xs font-bold text-[#ECEBE6]/60 hover:text-[#ECEBE6] transition-all shadow-sm hover:shadow-md"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <ChatMessageItem 
              key={idx}
              msg={msg}
              idx={idx}
              onCopy={handleCopy}
              copiedIdx={copiedIdx}
              notes={notes}
              onAddTag={handleAddTag}
            />
          ))
        )}

        {streamingMessage && (
          <ChatMessageItem 
            msg={{ role: 'model', text: streamingMessage, timestamp: Date.now() }}
            idx={-1}
            onCopy={() => {}}
            copiedIdx={null}
            notes={notes}
            onAddTag={handleAddTag}
          />
        )}

        {isLoading && (
          <div className="flex gap-4 p-5 max-w-full items-center animate-pulse">
            <div className="w-8 h-8 bg-[#D97757] text-black rounded-xl flex items-center justify-center font-black text-xs">
              C
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#9B9990]">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#D97757] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-[#D97757] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-[#D97757] rounded-full animate-bounce" />
              </div>
              {aiStatus === 'updating' ? 'Page making...' : 'Thinking...'}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Dock */}
      <div className="p-4 bg-[#181816] border-t border-[#2B2A27] shrink-0 pb-8 sm:pb-4">
        {selectedNotes.length > 0 && (
          <div className="max-w-3xl mx-auto mb-3 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 fade-in">
            {selectedNotes.map(note => (
              <div 
                key={note.id}
                className="bg-[#D97757]/10 border border-[#D97757]/30 text-[#D97757] px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <span>{note.emoji || '📝'}</span>
                <span className="max-w-[120px] truncate">{note.title}</span>
                <button onClick={() => toggleNoteSelection(note)} className="hover:text-white">
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="max-w-3xl mx-auto bg-[#22211F] border border-[#363430] focus-within:border-[#D97757]/50 focus-within:ring-1 focus-within:ring-[#D97757]/20 rounded-[28px] p-3 shadow-2xl transition-all group">
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
            placeholder="How can I help you?"
            rows={1}
            className="w-full bg-transparent text-[15px] text-[#ECEBE6] placeholder-[#9B9990]/40 resize-none outline-none px-3 py-1.5 leading-relaxed font-medium min-h-[44px] max-h-[200px] no-scrollbar"
          />

          <div className="flex items-center justify-between pt-2 px-1">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setShowNoteSelector(true)}
                className={cn(
                  "p-2 rounded-xl transition-all active:scale-90",
                  selectedNotes.length > 0 ? "bg-[#D97757] text-black" : "hover:bg-[#2B2A27] text-[#9B9990] hover:text-[#ECEBE6]"
                )}
                title="Attach Context"
              >
                <Paperclip size={18} />
              </button>
            </div>

            <button
              onClick={handleSend}
              disabled={(!input.trim() && selectedNotes.length === 0) || isLoading}
              className={cn(
                "w-10 h-10 rounded-full transition-all flex items-center justify-center shadow-lg",
                (input.trim() || selectedNotes.length > 0) && !isLoading
                  ? "bg-[#D97757] text-black hover:bg-[#c56647] active:scale-90 shadow-[#D97757]/20"
                  : "bg-[#2B2A27] text-[#9B9990]/30 cursor-not-allowed"
              )}
            >
              <Send size={18} fill={(input.trim() || selectedNotes.length > 0) && !isLoading ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
