import React, { useState, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { Modal } from './Modal';
import { X } from 'lucide-react';
import { t as tr } from '../../utils/translator';

interface TagManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tags: string[];
  placeholder?: string;
  onSave: (tags: string[]) => void;
}

export function TagManagerDialog({
  isOpen,
  onClose,
  tags: initialTags = [],
  placeholder,
  onSave
}: TagManagerDialogProps) {
  const [currentTags, setCurrentTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentTags(initialTags || []);
      setInputValue('');
    }
  }, [isOpen, initialTags]);

  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    const newTags = trimmed.split(',').map(t => t.trim()).filter(Boolean);
    const updated = Array.from(new Set([...currentTags, ...newTags]));
    
    setCurrentTags(updated);
    setInputValue('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = currentTags.filter(t => t !== tagToRemove);
    setCurrentTags(updated);
  };

  const handleSave = () => {
    let updated = [...currentTags];
    if (inputValue.trim()) {
      const newTags = inputValue.trim().split(',').map(t => t.trim()).filter(Boolean);
      updated = Array.from(new Set([...updated, ...newTags]));
      setCurrentTags(updated);
      setInputValue('');
    }
    onSave(updated);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={tr('dialogs.tags')}>
      <div className="space-y-6">
        {/* Existing tags list */}
        <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 custom-scrollbar border border-white/5 bg-black/25 rounded-2xl min-h-[60px] items-center px-3">
          {currentTags.length > 0 ? (
            currentTags.map(tag => (
              <span 
                key={tag} 
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-bold"
              >
                <span>{tag}</span>
                <button 
                  onClick={() => handleRemoveTag(tag)}
                  className="p-0.5 hover:bg-white/10 rounded-full text-blue-400 hover:text-white transition-all active:scale-75"
                  type="button"
                >
                  <X size={12} />
                </button>
              </span>
            ))
          ) : (
            <p className="text-xs text-white/40 italic py-2">{tr('dialogs.noTags')}</p>
          )}
        </div>

        {/* Input box */}
        <div className="space-y-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder ?? tr('dialogs.tagPlaceholder')}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 outline-none text-white font-medium text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <p className="text-[10px] text-white/30 px-1 font-bold uppercase tracking-wider">{tr('dialogs.tagHint')}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-[18px] font-bold transition-all text-white/60 text-xs uppercase tracking-wider">
            {tr('dialogs.close')}
          </button>
          <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-[18px] font-bold transition-all text-white text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20">
            {tr('dialogs.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface InputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
  title: string;
  placeholder?: string;
  initialValue?: string;
  type?: string;
  confirmText?: string;
  cancelText?: string;
}

export function InputDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  placeholder, 
  initialValue = '', 
  type = 'text',
  confirmText,
  cancelText
}: InputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setError('');
    }
  }, [isOpen, initialValue]);

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try { await onConfirm(value); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : tr('dialogs.tryAgain')); }
    finally { setBusy(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <input
          type={type}
          aria-label={title}
          disabled={busy}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? tr('dialogs.tagPlaceholder')}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-blue-500 outline-none text-white font-medium"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
        />
        {error && <p role="alert" className="text-red-300 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-[18px] font-bold transition-all text-white/60">
            {cancelText ?? tr('dialogs.cancel')}
          </button>
          <button disabled={busy} onClick={handleConfirm} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-[18px] font-bold transition-all text-white">
            {confirmText ?? tr('dialogs.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  cancelText,
  variant = 'primary'
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-sm text-white/60 leading-relaxed font-medium">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-[18px] font-bold transition-all text-white/60">
            {cancelText ?? tr('dialogs.cancel')}
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`flex-1 py-3 ${variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} rounded-[18px] font-bold transition-all text-white`}
          >
            {confirmText ?? tr('dialogs.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
