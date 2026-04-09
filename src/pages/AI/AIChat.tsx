/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataManager, ChatMessage, Note, AITask, ContextSummary } from '../../utils/DataManager';
import { exportChatHistory } from '../../utils/export';
import { AIInterface } from './components/ChatInterface';
import { ChatInput } from './components/ChatInput';
import { handleSendMessage } from './components/chatLogic';
import { deleteChatHistory, resetAIMemory } from './components/chatActions';

console.log('AIChat: File loaded');

/**
 * Main AI Chat component (main.tsx).
 * Orchestrates the modular components and manages the overall state.
 */
const AIChat: React.FC = () => {
  console.log('AIChat: Rendering component');
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'generating' | 'checking' | 'updating'>('idle');
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState<number | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [contextSummary, setContextSummary] = useState<ContextSummary | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('picoapps');
  const [selectedModel, setSelectedModel] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [attachedNotes, setAttachedNotes] = useState<Note[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isBottom = Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) < 100;
    setIsAtBottom(isBottom);
  };

  const loadHistory = useCallback(async () => {
    const history = await DataManager.getChatHistory();
    setMessages(history);
  }, []);

  const loadNotes = useCallback(async () => {
    const allNotes = await DataManager.getAllNotes();
    setNotes(allNotes);
  }, []);

  const loadTasks = useCallback(async () => {
    const allTasks = await DataManager.getTasks();
    setTasks(allTasks);
  }, []);

  const loadContextSummary = useCallback(async () => {
    const summary = await DataManager.getContextSummary();
    if (summary && summary.text) {
      setContextSummary(summary);
    } else {
      setContextSummary(null);
    }
  }, []);

  const loadAISettings = useCallback(async () => {
    const settings = await DataManager.getAISettings();
    const provider = settings.selectedProvider || 'picoapps';
    setSelectedProvider(provider);
    
    if (provider === 'picoapps') {
      setSelectedModel('Free');
    } else if (settings.selectedModels && settings.selectedModels[provider as keyof typeof settings.selectedModels]) {
      setSelectedModel(settings.selectedModels[provider as keyof typeof settings.selectedModels]);
    } else {
      setSelectedModel('AI');
    }
  }, []);

  useEffect(() => {
    console.log('AIChat: Initializing...');
    const init = async () => {
      try {
        await Promise.all([
          loadHistory(),
          loadNotes(),
          loadTasks(),
          loadContextSummary(),
          loadAISettings()
        ]);
        console.log('AIChat: Data loaded successfully');
      } catch (err) {
        console.error('AIChat: Failed to load data:', err);
      }
    };
    
    init();

    // Listen for sync events from other tabs
    const handleSync = (data: any) => {
      console.log('AIChat: Received sync event', data);
      if (data.type === 'UPDATE_CHAT' || data.type === 'CLEAR_CHAT') {
        loadHistory();
      } else if (data.type === 'UPDATE_NOTE' || data.type === 'DELETE_NOTE' || data.type === 'DELETE_NOTES') {
        loadNotes();
      } else if (data.type === 'UPDATE_TASKS' || data.type === 'DELETE_TASK') {
        loadTasks();
      }
    };
    
    DataManager.onSync(handleSync);
    
    fetch('/system_prompt.txt')
      .then(res => res.text())
      .then(text => {
        console.log('AIChat: System prompt loaded');
        setSystemPrompt(text);
      })
      .catch(err => {
        console.error('AIChat: Failed to load system prompt:', err);
        setSystemPrompt("You are a professional Content Creator and AI Assistant. ALWAYS use standard Markdown for formatting. For any content generation (summaries, lists, articles), you MUST use <create_page> or <update_page> XML tags. End every message with [COMPLETION: X%]. Reply in the user's language.");
      });

    return () => {
      DataManager.offSync();
    };
  }, [loadHistory, loadNotes, loadTasks, loadContextSummary, loadAISettings]);

  const scrollToBottom = useCallback(() => {
    if (isAtBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [isAtBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  const cleanAIText = (text: string) => {
    if (!text) return "";
    let cleaned = text
      // Remove XML commands
      .replace(/<(create_page|update_page|create_task|update_task_status|complete_part|prune_context|verify_page|replace_content)>[\s\S]*?<\/\1>/gi, '')
      
      // Remove common AI prefixes and meta-talk (multiline)
      .replace(/^(User|AI|Model|Assistant|System|Bot|Verifier):\s*/gim, '')
      .replace(/^(I'm processing|Processing|Generating|Sure, I can help|Certainly|Here is|I've created|I am creating|I will|Okay|Sure|I have updated|The page has been|I've added).*\.?/gim, '')
      .replace(/^(এখানে আপনার|আমি আপনার|পেজটি তৈরি|আপডেট করা হয়েছে|নিচে আপনার|প্রথাগত নিয়মোনুয়া|পেইজ ডিজাইন না করার জন্য নিজের যত্ন নেওয়া নিরাপদ).*\.?/gim, '')
      
      // Remove templates and internal tags
      .replace(/\[(Task Title|Task Description|Part \d+ Title|Detailed HTML Content|NoteID or Title|Result\/Content|Summary of important context to keep|Number of messages to delete from start|Criteria)\]/gi, '')
      .replace(/\[COMPLETION:\s*\d+%\]/gi, '')
      .replace(/\[COUNT:\s*\d+\]/gi, '')
      .replace(/\[REAL_COMPLETION:\s*\d+%\]/gi, '')
      .replace(/\[REASON:\s*[^\]]+\]/gi, '')
      .replace(/\[CONTINUATION_PROMPT:\s*[\s\S]+?\]/gi, '')
      
      // Final cleanup
      .trim();
    
    if (cleaned === "" && text.includes('<')) {
      if (text.includes('<create_page>')) return "নতুন পেজ তৈরি করা হয়েছে।";
      if (text.includes('<update_page>')) return "পেজটি আপডেট করা হয়েছে।";
      if (text.includes('<create_task>')) return "নতুন টাস্ক শুরু করা হয়েছে।";
      return "কাজটি সফলভাবে সম্পন্ন হয়েছে।";
    }
    
    return cleaned; // Returning raw markdown now
  };

  const onSendMessage = async () => {
    const currentAttachments = [...attachedNotes];
    setAttachedNotes([]); // Clear UI immediately for better UX
    
    await handleSendMessage(
      input,
      messages,
      systemPrompt,
      contextSummary,
      notes,
      setIsLoading,
      setAiStatus,
      setAiReason,
      setCompletionPercentage,
      setMessages,
      setStreamingMessage,
      setInput,
      loadNotes,
      loadTasks,
      loadContextSummary,
      loadHistory,
      currentAttachments
    );
  };

  const onClearHistory = () => {
    deleteChatHistory(setMessages, setTasks, setContextSummary, setShowClearConfirm);
  };

  const onResetMemory = () => {
    resetAIMemory(setContextSummary, setShowClearConfirm);
  };

  const onExportChat = () => {
    exportChatHistory(messages);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    const lastWord = value.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const filteredMentions = useMemo(() => {
    const lastWord = input.split(' ').pop() || '';
    const query = lastWord.slice(1).toLowerCase();
    return notes.filter(n => n.title.toLowerCase().includes(query)).slice(0, 5);
  }, [input, notes]);

  const selectMention = (note: Note) => {
    const words = input.split(' ');
    words.pop();
    setInput(words.join(' ') + (words.length > 0 ? ' ' : '') + `[${note.title}] `);
    setShowMentions(false);
  };

  try {
    return (
      <div className="flex flex-col min-h-screen bg-[#0d0d0d] text-white font-sans text-[0.92rem]">
      <AIInterface
        messages={messages}
        streamingMessage={streamingMessage}
        isLoading={isLoading}
        aiStatus={aiStatus}
        aiReason={aiReason}
        completionPercentage={completionPercentage}
        notes={notes}
        tasks={tasks}
        contextSummary={contextSummary}
        showClearConfirm={showClearConfirm}
        setShowClearConfirm={setShowClearConfirm}
        confirmClearHistory={onClearHistory}
        resetAIMemory={onResetMemory}
        exportChat={onExportChat}
        navigateBack={() => navigate('/')}
        navigateToEditor={(id) => navigate(`/editor/${id}`)}
        navigateToSettings={() => navigate('/ai/settings')}
        selectedModel={selectedModel}
        setInput={setInput}
        cleanAIText={cleanAIText}
        messagesEndRef={messagesEndRef}
        onScroll={handleScroll}
      />
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        handleSend={onSendMessage}
        handleInputChange={handleInputChange}
        showMentions={showMentions}
        filteredMentions={filteredMentions}
        selectMention={selectMention}
        notes={notes}
        attachedNotes={attachedNotes}
        setAttachedNotes={setAttachedNotes}
      />
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .markdown-body p { margin-bottom: 0.75rem; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul { list-style: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-body ol { list-style: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { font-weight: bold; margin-bottom: 0.5rem; margin-top: 1rem; }
        .markdown-body blockquote { border-left: 3px solid rgba(255,255,255,0.1); padding-left: 1rem; color: rgba(255,255,255,0.5); font-style: italic; }
      `}</style>
    </div>
  );
  } catch (err) {
    console.error('AIChat: Rendering error:', err);
    return <div className="p-10 text-red-500">AI Page Error: {String(err)}</div>;
  }
};

export default AIChat;
