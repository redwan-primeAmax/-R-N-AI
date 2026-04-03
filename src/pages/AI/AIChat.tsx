/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataManager, ChatMessage, Note, AITask, ContextSummary } from '../../utils/DataManager';
import { exportChatHistory } from '../../utils/export';
import { TagConverter } from '../../utils/TagConverter';
import { AIInterface } from './components/ChatInterface';
import { ChatInput } from './components/ChatInput';
import { handleSendMessage } from './components/chatLogic';
import { deleteChatHistory, resetAIMemory } from './components/chatActions';

/**
 * Main AI Chat component (main.tsx).
 * Orchestrates the modular components and manages the overall state.
 */
const AIChat: React.FC = () => {
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    loadHistory();
    loadNotes();
    loadTasks();
    loadContextSummary();
    loadAISettings();
    fetch('/system_prompt.txt')
      .then(res => res.text())
      .then(text => setSystemPrompt(text))
      .catch(err => {
        console.error('Failed to load system prompt:', err);
        setSystemPrompt("You are a professional Content Creator and AI Assistant. Use custom tags [B], [I], [H1-H6], [LIST], [ITEM] for formatting. End every message with [COMPLETION: X%]. Reply in the user's language.");
      });
  }, [loadHistory, loadNotes, loadTasks, loadContextSummary, loadAISettings]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  const cleanAIText = (text: string) => {
    let cleaned = text
      // Remove all commands
      .replace(/\/(?:create|update|complete|prune|verify|replace)_\w+\s+([^|]+)\|\s*([^|]+)\|\s*([\s\S]+?)(?=\s*\/(?:create|update|complete|prune|verify|replace)_\w+|$)/gi, '')
      .replace(/\/(?:create|update|complete|prune|verify|replace)_\w+\s+([^|]+)\|\s*([\s\S]+?)(?=\s*\/(?:create|update|complete|prune|verify|replace)_\w+|$)/gi, '')
      .replace(/\/(?:create|update|complete|prune|verify|replace)_\w+\s+([\s\S]+?)(?=\s*\/(?:create|update|complete|prune|verify|replace)_\w+|$)/gi, '')
      
      // Remove common AI prefixes and meta-talk
      .replace(/^(User|AI|Model|Assistant|System|Bot|Verifier):\s*/gim, '')
      .replace(/^(I'm processing|Processing|Generating|Sure, I can help|Certainly|Here is|I've created|I am creating|I will|Okay|Sure|I have updated|The page has been|I've added).*\.?/gi, '')
      .replace(/^(এখানে আপনার|আমি আপনার|পেজটি তৈরি|আপডেট করা হয়েছে).*\.?/gi, '')
      
      // Remove templates and internal tags
      .replace(/\[(Task Title|Task Description|Part \d+ Title|Detailed HTML Content|NoteID or Title|Result\/Content|Summary of important context to keep|Number of messages to delete from start|Criteria)\]/gi, '')
      .replace(/\[COMPLETION:\s*\d+%\]/gi, '')
      .replace(/\[COUNT:\s*\d+\]/gi, '')
      .replace(/\[REAL_COMPLETION:\s*\d+%\]/gi, '')
      .replace(/\[REASON:\s*[^\]]+\]/gi, '')
      .replace(/\[CONTINUATION_PROMPT:\s*[\s\S]+?\]/gi, '')
      
      // Final cleanup
      .trim();
    
    if (cleaned === "" && text.includes('/')) {
      return "কাজটি সফলভাবে সম্পন্ন হয়েছে।";
    }
    
    return TagConverter.toHTML(cleaned);
  };

  const onSendMessage = () => {
    handleSendMessage(
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
      loadHistory
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

  return (
    <div className="flex flex-col h-screen bg-[#191919] text-white">
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
};

export default AIChat;
