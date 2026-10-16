/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Send, Copy, Check, 
  Trash2, ChevronDown, Paperclip, X, Loader2, Plus, Settings
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { DataManager, ChatMessage, Note, AISettings } from '../../services/storage/DataManager';
import { handleAgenticSendMessage } from '../../services/agent/agentic';
import { useVisualViewport } from '../../hooks/useVisualViewport';
import { notify } from '../../utils/notify';
import { cn } from '../../utils/cn';
import { DEFAULT_MODEL_ID, useLanguage } from '../../utils/translator';

const NoteContextPicker = lazy(() => import('./NoteContextPicker'));

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
  onAddModel: () => void;
  addModelLabel: string;
  noModelsLabel: string;
}> = ({ isOpen, onClose, selectedModel, onSelect, anchorRect, models, onAddModel, addModelLabel, noModelsLabel }) => {
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
              <div className="space-y-2">
                <div className="px-3 py-2 text-[10px] text-white/30 font-bold uppercase tracking-widest text-center">{noModelsLabel}</div>
                <button
                  onClick={() => { onClose(); onAddModel(); }}
                  className="w-full px-3 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-[#D97757] text-black hover:bg-[#c56647] active:scale-95 transition-all"
                >
                  <Plus size={14} strokeWidth={3} />
                  <span>{addModelLabel}</span>
                </button>
              </div>
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
  isCopied: boolean;
  noteTitles: ReadonlyMap<string, string>;
  onAddTag: (noteId: string, tag: string) => Promise<boolean>;
  onOpenSettings?: () => void;
}> = React.memo(({ msg, idx, onCopy, isCopied, noteTitles, onAddTag, onOpenSettings }) => {
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
      const title = noteTitles.get(id.toLowerCase());
      return title !== undefined ? `"${title || 'শিরোনামহীন'}"` : id;
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

    const suggestion = suggestionData && <TagSuggestion
      noteId={suggestionData.noteId} tags={[...new Set(suggestionData.tags)]} addedTags={addedTags}
      onTagClick={async tag => {
        if (await onAddTag(suggestionData.noteId, tag)) setAddedTags(prev => [...new Set([...prev, tag])]);
      }}
    />;

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
          {suggestion}
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
        {suggestion}
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

  const renderedContent = useMemo(() => renderMessageContent(msg.text), [msg.text, msg.commandStatus, idx, noteTitles, addedTags, onAddTag]);

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
            aria-label="Copy message"
            onClick={() => onCopy(idx, msg.text)}
            className="text-[#9B9990] hover:text-[#ECEBE6] transition-colors p-1.5 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
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
          ) : renderedContent}

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
          
          {isError && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings?.();
                }}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Settings size={14} />
                <span>AI Settings খুলুন (API Key কনফিগার করুন)</span>
              </button>
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
});

export default function AIChat() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
  
  const viewportRef = useVisualViewport();
  const messagesRef = useRef<HTMLDivElement>(null);
  const followBottom = useRef(true);
  const mounted = useRef(false);
  const loadId = useRef(0);
  const busy = useRef(false);
  const request = useRef<{ controller: AbortController; promise: Promise<void> } | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamFrame = useRef(0);
  const pendingToken = useRef<string | null>(null);
  const noteTitles = useMemo(() => new Map(notes.map(n => [n.id.toLowerCase(), n.title])), [notes]);
  const openSettings = useCallback(() => navigate('/ai/settings'), [navigate]);
  const updateStream = useCallback((text: string | null) => {
    pendingToken.current = text;
    if (text === null) {
      cancelAnimationFrame(streamFrame.current);
      streamFrame.current = 0;
      if (mounted.current) setStreamingMessage(null);
    } else if (!streamFrame.current) {
      streamFrame.current = requestAnimationFrame(() => {
        streamFrame.current = 0;
        if (mounted.current) setStreamingMessage(pendingToken.current);
      });
    }
  }, []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelButtonRef = useRef<HTMLButtonElement>(null);

  const loadData = useCallback(async () => {
    const id = ++loadId.current;
    const [history, allNotes, settings] = await Promise.all([
      DataManager.getChatHistory(),
      DataManager.getAllNotes(),
      DataManager.getAISettings()
    ]);
    if (!mounted.current || id !== loadId.current) return;
    setMessages(history);
    setNotes(allNotes.filter(n => !n.isTrashed && !n.isLocked));
    setAiSettings(settings);
    
    const provider = settings.selectedProvider;
    const models = settings.providerModels?.[provider] || [];
    setAvailableModels(models);

    // Default to Gemini 1.5 Flash on open: keep an explicit saved choice
    // when it is still configured, otherwise prefer Gemini 1.5 Flash,
    // then the first configured model. With nothing configured the
    // header shows the "Add Model" action instead (see render below).
    const savedModel = settings.selectedModels?.[provider];
    const currentModel =
      (savedModel && (models.length === 0 || models.includes(savedModel)) ? savedModel : '') ||
      (provider === 'gemini'
        ? (models.includes(DEFAULT_MODEL_ID) ? DEFAULT_MODEL_ID : (models[0] || DEFAULT_MODEL_ID))
        : (models[0] || ''));
    setSelectedModel(currentModel);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void loadData().catch(() => notify('Could not load chat data.', 'error'));
    return () => {
      mounted.current = false;
      loadId.current++;
      request.current?.controller.abort();
      if (copyTimer.current) clearTimeout(copyTimer.current);
      cancelAnimationFrame(streamFrame.current);
    };
  }, [loadData]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const element = messagesRef.current;
      if (element && followBottom.current) element.scrollTop = element.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isLoading, streamingMessage, input]);

  useEffect(() => {
    if (!showModelPicker) return;
    const close = () => setShowModelPicker(false);
    window.addEventListener('resize', close);
    window.visualViewport?.addEventListener('resize', close);
    return () => {
      window.removeEventListener('resize', close);
      window.visualViewport?.removeEventListener('resize', close);
    };
  }, [showModelPicker]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (busy.current || (!input.trim() && selectedNotes.length === 0)) return;
    if (!aiSettings || (aiSettings.selectedProvider !== 'local' && !aiSettings.apiKeys[aiSettings.selectedProvider]?.trim())) {
      notify('AI Settings থেকে নির্বাচিত provider-এর API Key দিন।', 'error');
      return;
    }
    busy.current = true; // React state alone cannot prevent two same-frame clicks.
    followBottom.current = true;
    setIsLoading(true);
    setAiReason(null);
    const controller = new AbortController();
    const attachments = selectedNotes;
    setSelectedNotes([]);
    const promise = handleAgenticSendMessage(input, messages, {
      setIsLoading, setAiStatus, setAiReason, setMessages,
      setStreamingMessage: updateStream, setInput,
      loadHistory: loadData, loadNotes: () => {}, loadTasks: () => {}
    }, attachments, controller.signal);
    const active = { controller, promise };
    request.current = active;
    try {
      await promise;
    } catch (error) {
      if (!controller.signal.aborted) notify('Could not send the message.', 'error');
    } finally {
      if (request.current === active) { request.current = null; busy.current = false; }
    }
  };

  const handleClearChat = async () => {
    if (busy.current && !request.current) return;
    busy.current = true;
    setIsLoading(true);
    const active = request.current;
    request.current = null;
    active?.controller.abort();
    ++loadId.current;
    try {
      // Wait for any already-running command/save before clearing, so late writes
      // cannot resurrect a conversation after the user has deleted it.
      await active?.promise.catch(() => {});
      await DataManager.clearChatHistory();
      setMessages([]);
      updateStream(null);
      setAiStatus('idle');
      setAiReason(null);
    } catch {
      notify('Could not clear chat history.', 'error');
    } finally {
      busy.current = false;
      if (mounted.current) setIsLoading(false);
    }
  };

  const handleCopy = useCallback(async (idx: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (!mounted.current) return;
      setCopiedIdx(idx);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedIdx(null), 2000);
    } catch { notify('Could not copy to the clipboard.', 'error'); }
  }, []);

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

  const handleAddTag = useCallback(async (noteId: string, tag: string) => {
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
      return !!note;
    } catch (err) {
      console.error('Failed to add tag:', err);
      notify('Could not add this tag.', 'error');
      return false;
    }
  }, []);

  return (
    <div ref={viewportRef} className="ai-chat-viewport flex flex-col min-h-0 bg-[#181816] text-[#ECEBE6] font-sans selection:bg-[#D97757]/30 overflow-hidden">
      {showNoteSelector && <Suspense fallback={null}>
        <NoteContextPicker notes={notes} selectedNotes={selectedNotes} onToggle={toggleNoteSelection} onClose={() => setShowNoteSelector(false)} />
      </Suspense>}

      {/* Minimal Header */}
      <header className="h-14 border-b border-[#2B2A27] bg-[#181816] px-4 flex items-center justify-between z-[50] shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/main')}
            aria-label={t('ai.backToNotes')}
            className="p-1.5 hover:bg-[#2B2A27] rounded-lg text-[#9B9990] hover:text-[#ECEBE6] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="relative">
            {aiSettings && availableModels.length === 0 ? (
              /* No model configured yet — "Add Model" + button goes
                 straight to the model configuration page */
              <button
                onClick={() => navigate('/ai/settings')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D97757] text-black text-sm font-bold hover:bg-[#c56647] active:scale-95 transition-all shadow-lg shadow-[#D97757]/20"
              >
                <span>{t('ai.addModel')}</span>
                <Plus size={15} strokeWidth={3} />
              </button>
            ) : (
              <button
                ref={modelButtonRef}
                onClick={handleToggleModelPicker}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm font-bold",
                  showModelPicker ? "bg-[#2B2A27] text-[#ECEBE6]" : "hover:bg-[#2B2A27] text-[#ECEBE6]/80"
                )}
              >
                <div className="w-2 h-2 rounded-full bg-[#D97757] shadow-[0_0_8px_rgba(217,119,87,0.5)]" />
                <span>{selectedModel || t('ai.selectModel')}</span>
                <ChevronDown size={14} className={cn("text-[#9B9990] transition-transform duration-200", showModelPicker && "rotate-180")} />
              </button>
            )}

            <ModelPicker
              isOpen={showModelPicker}
              onClose={() => setShowModelPicker(false)}
              selectedModel={selectedModel}
              onSelect={handleSelectModel}
              anchorRect={pickerAnchor}
              models={availableModels}
              onAddModel={() => navigate('/ai/settings')}
              addModelLabel={t('ai.addModel')}
              noModelsLabel={t('ai.noModelsConfigured')}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/ai/settings')}
            className="p-2 hover:bg-[#2B2A27] rounded-lg text-[#9B9990] hover:text-[#ECEBE6] transition-colors text-xs font-bold flex items-center gap-1.5"
            title="AI Settings"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">{t('ai.settings')}</span>
          </button>
          <button
            onClick={handleClearChat}
            aria-label="Clear chat"
            className="p-2 hover:bg-[#2B2A27] rounded-lg text-[#9B9990] hover:text-[#ECEBE6] transition-colors text-xs font-bold flex items-center gap-1.5"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">{t('ai.clearChat')}</span>
          </button>
        </div>
      </header>

      {/* Chat Messages */}
      <div ref={messagesRef} onScroll={e => {
        const element = e.currentTarget;
        followBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6 space-y-6 max-w-3xl mx-auto w-full no-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 my-auto py-20 animate-in fade-in duration-700">
            <div className="w-16 h-16 bg-[#D97757]/10 text-[#D97757] rounded-[24px] flex items-center justify-center border border-[#D97757]/20 shadow-inner">
              <Sparkles size={32} />
            </div>
            <div className="space-y-2 max-w-md px-4">
              <h2 className="text-2xl font-black text-[#ECEBE6] tracking-tight">{t('ai.welcomeTitle')}</h2>
              <p className="text-sm text-[#9B9990] leading-relaxed font-medium">
                {t('ai.welcomeDesc')}
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
              isCopied={copiedIdx === idx}
              noteTitles={noteTitles}
              onAddTag={handleAddTag}
              onOpenSettings={openSettings}
            />
          ))
        )}

        {streamingMessage && (
          <ChatMessageItem 
            msg={{ role: 'model', text: streamingMessage, timestamp: Date.now() }}
            idx={-1}
            onCopy={() => {}}
            isCopied={false}
            noteTitles={noteTitles}
            onAddTag={handleAddTag}
            onOpenSettings={openSettings}
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

        <div className="h-4" />
      </div>

      {/* Input Dock */}
      <div className="ai-chat-composer p-3 sm:p-4 bg-[#181816] border-t border-[#2B2A27] shrink-0">
        {selectedNotes.length > 0 && (
          <div className="max-w-3xl mx-auto mb-3 max-h-20 overflow-y-auto flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 fade-in">
            {selectedNotes.map(note => (
              <div 
                key={note.id}
                className="bg-[#D97757]/10 border border-[#D97757]/30 text-[#D97757] px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                <span>{note.emoji || '📝'}</span>
                <span className="max-w-[120px] truncate">{note.title}</span>
                <button aria-label={`Remove ${note.title || "note"}`} onClick={() => toggleNoteSelection(note)} className="hover:text-white">
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
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                handleSend();
              }
            }}
            aria-label={t('ai.messageLabel')}
            placeholder={t('ai.placeholder')}
            rows={1}
            className="w-full bg-transparent text-[16px] text-[#ECEBE6] placeholder-[#9B9990]/40 resize-none outline-none px-3 py-1.5 leading-relaxed font-medium min-h-[44px] max-h-[200px] no-scrollbar"
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
              aria-label="Send message"
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
