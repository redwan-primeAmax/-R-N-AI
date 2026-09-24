/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, FileText, Languages, HelpCircle, Copy, ArrowDown, RefreshCw, X, Check } from 'lucide-react';
import { AIServiceFactory } from '../../../services/ai/ServiceFactory';
import { DataManager } from '../../../services/storage/DataManager';
import { cn } from '../../../utils/cn';

interface AiInlineToolbarProps {
  editor: any;
  isLight: boolean;
}

export const AiInlineToolbar: React.FC<AiInlineToolbarProps> = ({ editor, isLight }) => {
  const [selectionText, setSelectionText] = useState('');
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [modalAction, setModalAction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [copied, setCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        if (!modalAction) {
          setToolbarPos(null);
          setSelectionText('');
          setSelectionRange(null);
        }
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 2) return;

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectionText(text);
      setSelectionRange(range);
      setToolbarPos({
        top: Math.max(10, rect.top + window.scrollY - 45),
        left: Math.max(10, rect.left + window.scrollX + rect.width / 2 - 120)
      });
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('keyup', handleSelection);
    };
  }, [modalAction]);

  const handleAiAction = async (actionType: 'improve' | 'summarize' | 'translate' | 'explain') => {
    if (!selectionText) return;
    setModalAction(actionType);
    setLoading(true);
    setAiResult('');

    let prompt = '';
    switch (actionType) {
      case 'improve':
        prompt = `Improve the language, clarity, and phrasing of the following text while keeping its core meaning intact. Return ONLY the improved text:\n\n"${selectionText}"`;
        break;
      case 'summarize':
        prompt = `Provide a concise bulleted summary of the following text:\n\n"${selectionText}"`;
        break;
      case 'translate':
        prompt = `If the text is in Bengali, translate it into clear English. If it is in English, translate it into natural Bengali. Return ONLY the translation:\n\n"${selectionText}"`;
        break;
      case 'explain':
        prompt = `Explain the following text or concepts simply and clearly in 2-3 sentences:\n\n"${selectionText}"`;
        break;
    }

    try {
      const provider = localStorage.getItem('ai_provider') || 'gemini';
      const aiService = AIServiceFactory.getService(provider);
      const settings = await DataManager.getAISettings();
      const response = await aiService.sendMessage(prompt, { 
        settings, 
        systemPrompt: 'You are an AI assistant helping with text editing.' 
      });
      setAiResult(response || 'No response generated.');
    } catch (err) {
      console.error('AI Inline action error:', err);
      setAiResult('AI সার্ভিস ব্যবহারে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = () => {
    if (!editor || !aiResult) return;
    const activeBlockId = editor.activeBlockId;
    if (activeBlockId) {
      editor.updateBlockContent(activeBlockId, aiResult);
    } else {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(aiResult));
      }
    }
    closeModal();
  };

  const handleInsertBelow = () => {
    if (!editor || !aiResult) return;
    const activeBlockId = editor.activeBlockId;
    if (activeBlockId) {
      editor.addBlockAfter(activeBlockId, 'paragraph', aiResult);
    }
    closeModal();
  };

  const handleCopyResult = () => {
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setModalAction(null);
    setToolbarPos(null);
    setAiResult('');
    setLoading(false);
  };

  return (
    <>
      {/* Floating Mini Toolbar */}
      {toolbarPos && !modalAction && (
        <div
          ref={toolbarRef}
          style={{ top: `${toolbarPos.top}px`, left: `${toolbarPos.left}px` }}
          className="fixed z-[300] flex items-center gap-1 p-1 bg-[#1c1c1c] text-white rounded-xl shadow-2xl border border-white/10 text-xs animate-in fade-in zoom-in duration-150"
        >
          <button
            onClick={() => handleAiAction('improve')}
            className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Improve text"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>মানোন্নয়ন</span>
          </button>

          <button
            onClick={() => handleAiAction('summarize')}
            className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Summarize"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>সারসংক্ষেপ</span>
          </button>

          <button
            onClick={() => handleAiAction('translate')}
            className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Translate"
          >
            <Languages className="w-3.5 h-3.5 text-green-400" />
            <span>অনুবাদ</span>
          </button>

          <button
            onClick={() => handleAiAction('explain')}
            className="flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Explain"
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
            <span>ব্যাখ্যা</span>
          </button>
        </div>
      )}

      {/* Result Modal */}
      <AnimatePresence>
        {modalAction && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1c1c1c] border border-white/10 rounded-2xl max-w-lg w-full p-5 shadow-2xl text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-sm">
                    AI অ্যাকশন ({modalAction === 'improve' ? 'মানোন্নয়ন' : modalAction === 'summarize' ? 'সারসংক্ষেপ' : modalAction === 'translate' ? 'অনুবাদ' : 'ব্যাখ্যা'})
                  </h3>
                </div>
                <button onClick={closeModal} className="p-1 hover:bg-white/10 rounded-lg cursor-pointer">
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              {loading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-white/60">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs font-medium">AI প্রসেস হচ্ছে...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-sm max-h-60 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                    {aiResult}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={handleCopyResult}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                    </button>

                    <button
                      onClick={handleInsertBelow}
                      className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-blue-500/30 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>নিচে যোগ করুন</span>
                    </button>

                    <button
                      onClick={handleReplace}
                      className="px-3 py-1.5 bg-amber-500 text-black hover:bg-amber-400 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>প্রতিস্থাপন করুন</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
