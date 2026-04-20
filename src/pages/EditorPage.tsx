/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Placeholder } from '@tiptap/extension-placeholder';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Image } from '@tiptap/extension-image';
import { Details } from '@tiptap/extension-details';
import { DetailsSummary } from '@tiptap/extension-details-summary';
import { DetailsContent } from '@tiptap/extension-details-content';
import { 
  ArrowLeft, Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, CheckSquare, Quote, Code, 
  Highlighter, AlignLeft, AlignCenter, AlignRight, Type, 
  Minus, Palette, Menu, Download, Mic, MicOff, Heading, Trash2, Sparkles, Loader2, UploadCloud, Copy, AlertCircle,
  Undo, Redo, Image as ImageIcon, ChevronDown, Save, Video, Music
} from 'lucide-react';
import EditorMenu from '../components/EditorMenu';
import { DataManager, Note } from '../utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';
import localforage from 'localforage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const FONTS = [
  { name: 'Default', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'JetBrains Mono, monospace' },
  { name: 'Cursive', value: 'cursive' },
];

const COLORS = [
  { name: 'Default', value: 'inherit' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Purple', value: '#a855f7' },
];

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📝');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [isListening, setIsListening] = useState(false);
  const [currentHeading, setCurrentHeading] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedCode, setPublishedCode] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showEditorMenu, setShowEditorMenu] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // LocalStorage backup key
  const BACKUP_KEY = `note_backup_${id}`;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start typing your thoughts...' }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full h-auto border border-white/10',
        },
      }),
      Details,
      DetailsSummary,
      DetailsContent,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      // Backup to localforage immediately on change
      if (id) {
        localforage.setItem(BACKUP_KEY, content).catch(err => {
          console.error('Backup failed:', err);
        });
      }

      // Handle '>>' shortcut for code block
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      const textBefore = $from.parent.textContent;
      if (textBefore.endsWith('>>')) {
        editor.chain()
          .deleteRange({ from: $from.pos - 2, to: $from.pos })
          .insertContent('<pre style="background: #f4f4f4; padding: 1rem; border-radius: 0.5rem; font-family: monospace; border: 1px solid #ddd;"><code> </code></pre>')
          .focus()
          .run();
      }
    },
  });

  const handlePublish = async () => {
    if (note) {
      setIsPublishing(true);
      setNotification({ message: publishedCode ? 'Updating cloud note...' : 'Publishing to cloud...', type: 'info' });
      try {
        const currentContent = editor?.getHTML() || '';
        if (publishedCode) {
          await DataManager.updatePublishedNote({ ...note, content: currentContent });
          setNotification({ message: 'Update successful!', type: 'success' });
        } else {
          const code = await DataManager.publishToSupabase({ ...note, content: currentContent });
          setPublishedCode(code);
          setNotification({ message: 'Published successfully!', type: 'success' });
          setTimeout(() => setShowShareModal(true), 500);
        }
        setShowEditorMenu(false);
      } catch (e: any) {
        setErrorMessage(e.message || String(e));
        setShowErrorModal(true);
        setNotification(null);
      } finally {
        setIsPublishing(false);
        setTimeout(() => setNotification(null), 3000);
      }
    }
  };

  // Speech to Text Logic
  const startListening = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            editor?.commands.insertContent(event.results[i][0].transcript + ' ');
          }
        }
      };

      recognition.start();
      (window as any).recognition = recognition;
    } catch (err) {
      console.error("Microphone permission denied", err);
      alert("Please allow microphone access to use speech-to-text.");
    }
  };

  const stopListening = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if ((window as any).recognition) {
      (window as any).recognition.stop();
      setIsListening(false);
    }
  };

  const cycleHeading = () => {
    // H1 smallest (base), H6 largest (4xl)
    // Cycling 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 1
    const nextHeading = currentHeading >= 6 ? 1 : currentHeading + 1;
    setCurrentHeading(nextHeading);
    editor?.chain().focus().setHeading({ level: nextHeading as any }).run();
  };

  const clearSelection = () => {
    if (editor?.state.selection.empty) {
      // If no selection, maybe clear the current line/block?
      // For now, let's just delete the selection if it exists
      editor?.chain().focus().deleteSelection().run();
    } else {
      editor?.chain().focus().deleteSelection().run();
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const confirmDeleteNote = async () => {
    if (note) {
      await DataManager.deleteNote(note.id);
      handleBack();
    }
  };

  useEffect(() => {
    if (id) {
      loadNote(id);
    }
    
    // Listen for sync events from other tabs
    const handleSync = (data: any) => {
      if (data.type === 'UPDATE_NOTE' && data.id === id && data.senderId !== DataManager.getClientId()) {
        loadNote(id);
      } else if (data.type === 'DELETE_NOTE' && data.id === id) {
        navigate('/');
      }
    };
    
    DataManager.onSync(handleSync);
    
    return () => {
      DataManager.offSync();
    };
  }, [id, editor]);

  useEffect(() => {
    // Autosave every 5 seconds
    const autosaveInterval = setInterval(() => {
      if (editor && note) {
        const content = editor.getHTML();
        saveNote(content);
      }
    }, 5000);

    // Handle keyboard positioning
    const handleResize = () => {
      if (window.visualViewport) {
        const height = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(height > 0 ? height : 0);
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      clearInterval(autosaveInterval);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [editor, note, title, emoji]);

  const loadNote = async (noteId: string) => {
    const fetchedNote = await DataManager.getNoteById(noteId);
    if (fetchedNote) {
      setNote(fetchedNote);
      setTitle(fetchedNote.title);
      setEmoji(fetchedNote.emoji);
      setPublishedCode(fetchedNote.publishedCode || null);
      
      // Check for backup in localforage
      const backup = await localforage.getItem<string>(BACKUP_KEY);
      if (backup && backup !== fetchedNote.content) {
        // If backup exists and is different, use it (or could ask user)
        editor?.commands.setContent(backup);
      } else {
        editor?.commands.setContent(fetchedNote.content);
      }
    } else {
      navigate('/');
    }
  };

  const saveNote = async (content: string) => {
    if (note && editor) {
      if (isSaving) return; // Prevent concurrent saves
      
      setIsSaving(true);
      try {
        const updatedTitle = title || 'Untitled';
        const updatedEmoji = emoji || '📝';
        const updatedNote = await DataManager.saveNote({ 
          ...note, 
          title: updatedTitle, 
          content, 
          emoji: updatedEmoji 
        });
        
        setNote(updatedNote); // Sync state with saved note (important for updatedAt)
        
        // Clear backup after successful save
        await localforage.removeItem(BACKUP_KEY);
      } catch (err) {
        console.error('Save failed:', err);
      } finally {
        setTimeout(() => setIsSaving(false), 500);
      }
    }
  };

  const updateTitle = async (newTitle: string) => {
    setTitle(newTitle);
    if (note) {
      const updatedNote = { ...note, title: newTitle, updatedAt: Date.now() };
      await DataManager.saveNote(updatedNote);
    }
  };

  const toggleEmoji = () => {
    const emojis = ['📝', '💡', '🚀', '📚', '🎨', '🎯', '📅', '🔒', '⭐', '🔥'];
    const currentIndex = emojis.indexOf(emoji);
    const nextIndex = (currentIndex + 1) % emojis.length;
    const nextEmoji = emojis[nextIndex];
    setEmoji(nextEmoji);
    if (note) {
      DataManager.saveNote({ ...note, emoji: nextEmoji, updatedAt: Date.now() });
    }
  };

  const handleExport = () => {
    if (note) {
      DataManager.exportNoteAsTxt({ ...note, title, content: editor?.getHTML() || '' });
      setShowExportMenu(false);
    }
  };

  const handleCopyContent = () => {
    if (editor) {
      const text = editor.getText();
      navigator.clipboard.writeText(text).then(() => {
        setNotification({ message: 'Content copied to clipboard!', type: 'success' });
        setTimeout(() => setNotification(null), 2000);
        setShowEditorMenu(false);
      }).catch(() => {
        setNotification({ message: 'Failed to copy content', type: 'error' });
        setTimeout(() => setNotification(null), 2000);
      });
    }
  };

  const handleManualSave = async () => {
    if (note && editor) {
      const content = editor.getHTML();
      const version = prompt('Version name (e.g., 1.0):', '1.0');
      if (version) {
        await DataManager.saveVersion({ ...note, title, content, emoji }, version);
        setNotification({ message: `Version ${version} saved!`, type: 'success' });
        setTimeout(() => setNotification(null), 2000);
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMedia = (type: 'image' | 'video' | 'audio' = 'image') => {
    setMediaType(type);
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : 'audio/*';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor && note) {
      setNotification({ message: 'Uploading media...', type: 'info' });
      
      try {
        const url = await DataManager.uploadMedia(file, `notes/${note.id}`);
        console.log('Media uploaded, URL:', url);
        
        // Re-focus and insert at selection
        editor.chain().focus();
        
        if (mediaType === 'image') {
          editor.commands.setImage({ src: url });
        } else if (mediaType === 'video') {
          editor.commands.insertContent(`<video src="${url}" controls style="width: 100%; border-radius: 1rem; margin: 1rem 0;"></video>`);
        } else if (mediaType === 'audio') {
          editor.commands.insertContent(`<audio src="${url}" controls style="width: 100%; margin: 1rem 0;"></audio>`);
        }
        
        // Immediately trigger a save with the latest HTML
        const newHtml = editor.getHTML();
        await saveNote(newHtml);
        
        setNotification({ message: 'Media uploaded successfully!', type: 'success' });
      } catch (err: any) {
        console.error('Media upload/insert error:', err);
        setErrorMessage(err.message || 'Failed to upload media');
        setShowErrorModal(true);
      } finally {
        setTimeout(() => setNotification(null), 3000);
        // Clear file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    const handlePlaceholderClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const placeholder = target.closest('.image-placeholder');
      if (placeholder) {
        const instruction = placeholder.getAttribute('data-instruction') || '';
        if (instruction.includes('video') || instruction.includes('ভিডিও')) {
          addMedia('video');
        } else if (instruction.includes('audio') || instruction.includes('অডিও') || instruction.includes('শব্দ')) {
          addMedia('audio');
        } else {
          addMedia('image');
        }
      }
    };

    document.addEventListener('click', handlePlaceholderClick);
    
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.tagName === 'AUDIO') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('click', handlePlaceholderClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [editor]);

  const confirmAddImage = () => {
    if (imageUrl.trim()) {
      editor?.chain().focus().setImage({ src: imageUrl.trim() }).run();
      setImageUrl('');
      setShowImageModal(false);
    }
  };

  if (!editor) return null;

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false,
    children, 
    className = "" 
  }: { 
    onClick: (e: React.MouseEvent) => void; 
    isActive?: boolean; 
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      disabled={disabled}
      className={cn(
        "p-2 rounded-lg flex-shrink-0 transition-colors duration-200",
        isActive ? "bg-blue-500 text-white" : "text-white/40 hover:bg-white/5",
        disabled && "opacity-20 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-32 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0d0d0d] border-b border-white/10 px-4 py-2 flex items-center gap-3">
        <button onClick={handleBack} className="p-1.5 text-white/40 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-grow flex items-center gap-2">
          <button onClick={() => setShowEditorMenu(true)} className="p-1.5 text-white/40 hover:text-white">
            <Menu size={20} />
          </button>
          
          <button onClick={toggleEmoji} className="text-xl hover:scale-110 transition-transform">
            {emoji}
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Untitled"
            className="flex-grow bg-transparent font-bold text-base outline-none placeholder:text-white/20 py-1 text-white"
          />
          
          {publishedCode && (
            <button 
              onClick={() => setShowShareModal(true)}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-bold border border-blue-500/30 flex items-center gap-1.5 hover:bg-blue-500/30 transition-all"
            >
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              {DataManager.getSyncStatus({ ...note!, content: editor?.getHTML() || '' }) === 'synced' ? 'Published' : 'Update'}
            </button>
          )}
          {isSaving && <div className="text-[8px] text-white/40 uppercase tracking-widest animate-pulse">Saving...</div>}
        </div>
      </header>

      {/* Editor Menu */}
      <AnimatePresence>
        {showEditorMenu && note && (
          <EditorMenu
            isOpen={showEditorMenu}
            onClose={() => setShowEditorMenu(false)}
            note={note}
            content={editor?.getHTML() || ''}
            isPublishing={isPublishing}
            publishedCode={publishedCode}
            onPublish={handlePublish}
            onCopy={handleCopyContent}
            syncStatus={DataManager.getSyncStatus({ ...note, content: editor?.getHTML() || '' })}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 60, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={cn(
              "fixed top-0 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border",
              notification.type === 'success' ? "bg-green-500/20 text-green-400 border-green-500/30" :
              notification.type === 'error' ? "bg-red-500/20 text-red-400 border-red-500/30" :
              "bg-blue-500/20 text-blue-400 border-blue-500/30"
            )}
          >
            {notification.type === 'info' && <Loader2 size={14} className="animate-spin" />}
            {notification.type === 'success' && <CheckSquare size={14} />}
            {notification.type === 'error' && <Trash2 size={14} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && publishedCode && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c1c] border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <UploadCloud size={32} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Note Published!</h3>
              <p className="text-white/40 text-sm mb-6">Share this code with others to let them import your note.</p>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 font-mono text-2xl tracking-widest font-bold text-blue-400">
                {publishedCode}
              </div>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(publishedCode);
                  alert('Code copied to clipboard!');
                }}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold mb-3 transition-all flex items-center justify-center gap-2"
              >
                <Copy size={16} />
                Copy Code
              </button>
              <button 
                onClick={() => setShowShareModal(false)}
                className="w-full py-3 bg-white text-black rounded-xl text-sm font-bold hover:bg-white/90 transition-all"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c1c] border border-red-500/20 p-8 rounded-3xl w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-red-400">Publish Failed</h3>
              <p className="text-white/60 text-sm mb-8 leading-relaxed">
                {errorMessage.includes('Supabase credentials missing') 
                  ? 'Supabase URL and Anon Key are missing. Please set them in the Settings menu to enable publishing.' 
                  : errorMessage}
              </p>
              
              <button 
                onClick={() => setShowErrorModal(false)}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Upload Modal */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c1c] border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ImageIcon size={32} className="text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-center">Insert Image</h3>
              <p className="text-white/40 text-sm mb-6 text-center">Enter the URL of the image you want to insert.</p>
              
              <input 
                type="text"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition-all mb-6"
              />

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowImageModal(false);
                    setImageUrl('');
                  }}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmAddImage}
                  disabled={!imageUrl.trim()}
                  className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  Insert
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Note?</h3>
              <p className="text-gray-500 text-sm mb-6">Are you sure you want to delete this note? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteNote}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor Content */}
      <main className="pt-20 px-6 max-w-2xl mx-auto">
        <EditorContent 
          editor={editor} 
          className="focus:outline-none min-h-[60vh] pb-80" 
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('.image-placeholder')) {
              // The click is already handled by the global listener added in useEffect
            }
          }}
        />
      </main>

      {/* Fixed Toolbar at the Bottom */}
      <div 
        className="fixed left-0 right-0 z-40 bg-[#1a1a1a] border-t border-white/10 shadow-lg flex flex-col-reverse transition-[bottom] duration-100 ease-out pb-safe"
        style={{ 
          bottom: keyboardHeight > 0 ? keyboardHeight : 0,
          paddingBottom: keyboardHeight > 0 ? '0px' : 'calc(env(safe-area-inset-bottom) + 8px)'
        }}
      >
        {/* Main Toolbar */}
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar bg-[#1a1a1a]">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo size={18} />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
            <UnderlineIcon size={18} />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />
          
          <ToolbarButton 
            onClick={cycleHeading} 
            isActive={editor.isActive('heading', { level: currentHeading })}
          >
            <div className="relative flex items-center justify-center">
              <Heading size={18} />
              <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-blue-500 text-white rounded-full w-3 h-3 flex items-center justify-center">
                {currentHeading}
              </span>
            </div>
          </ToolbarButton>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
            <ListOrdered size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')}>
            <CheckSquare size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setDetails().run()} isActive={editor.isActive('details')}>
            <ChevronDown size={18} />
          </ToolbarButton>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={() => addMedia('image')}>
            <ImageIcon size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => addMedia('video')}>
            <Video size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => addMedia('audio')}>
            <Music size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}>
            <Quote size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')}>
            <Code size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setShowHighlightMenu(!showHighlightMenu)} isActive={showHighlightMenu || editor.isActive('highlight')}>
            <div className="relative">
              <Highlighter size={18} />
              <div 
                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white"
                style={{ backgroundColor: editor.getAttributes('highlight').color || '#ffcc00' }}
              />
            </div>
          </ToolbarButton>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={(e) => { isListening ? stopListening(e) : startListening(e); }} isActive={isListening} className={isListening ? "animate-pulse bg-red-500/20 text-red-500" : ""}>
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </ToolbarButton>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>
            <AlignLeft size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>
            <AlignCenter size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}>
            <AlignRight size={18} />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />
          
          <ToolbarButton onClick={() => setShowFontMenu(!showFontMenu)} isActive={showFontMenu}>
            <Type size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setShowColorMenu(!showColorMenu)} isActive={showColorMenu}>
            <div className="relative">
              <Palette size={18} />
              <div 
                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white"
                style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }}
              />
            </div>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={18} />
          </ToolbarButton>

          <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={handleManualSave} className="text-blue-400">
            <Save size={18} />
          </ToolbarButton>
        </div>

        {/* Font & Color Submenus */}
        {showFontMenu && (
          <div className="bg-[#1a1a1a] border-b border-white/10 p-2 flex gap-2 overflow-x-auto no-scrollbar">
            {FONTS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  editor.chain().focus().setFontFamily(f.value).run();
                  setShowFontMenu(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] text-sm whitespace-nowrap text-white"
                style={{ fontFamily: f.value }}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
        {showColorMenu && (
          <div className="bg-[#1a1a1a] border-b border-white/10 p-2 flex gap-2 overflow-x-auto no-scrollbar">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  editor.chain().focus().setColor(c.value).run();
                  setShowColorMenu(false);
                }}
                className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0"
                style={{ backgroundColor: c.value === 'inherit' ? '#fff' : c.value }}
              />
            ))}
          </div>
        )}
        {showHighlightMenu && (
          <div className="bg-[#1a1a1a] border-b border-white/10 p-2 flex gap-2 overflow-x-auto no-scrollbar">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  if (c.value === 'inherit') {
                    editor.chain().focus().unsetHighlight().run();
                  } else {
                    editor.chain().focus().setHighlight({ color: c.value }).run();
                  }
                  setShowHighlightMenu(false);
                }}
                className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0"
                style={{ backgroundColor: c.value === 'inherit' ? '#fff' : c.value }}
              />
            ))}
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* CSS for Tiptap and no-scrollbar */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .ProseMirror { outline: none; }
        .image-placeholder {
          background: rgba(255, 255, 255, 0.05);
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          margin: 1rem 0;
          color: rgba(255, 255, 255, 0.6);
          font-weight: bold;
          transition: all 0.2s;
        }
        .image-placeholder:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #3b82f6;
          color: #3b82f6;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        ul[data-type="taskList"] { list-style: none; padding: 0; margin-left: 0.5rem; }
        ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; }
        ul[data-type="taskList"] li > label { 
          user-select: none; 
          margin-top: 0.2rem; 
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        ul[data-type="taskList"] li > div { flex: 1; }
        ul[data-type="taskList"] li > div > p { margin-bottom: 0 !important; }
        input[type="checkbox"] { width: 1.25rem; height: 1.25rem; border-radius: 0.25rem; border: 2px solid #ddd; appearance: none; cursor: pointer; position: relative; }
        input[type="checkbox"]:checked { background-color: #000; border-color: #000; }
        input[type="checkbox"]:checked::after { content: '✓'; position: absolute; color: white; font-size: 0.75rem; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        
        .ProseMirror h1, .ProseMirror .h1 { font-size: 2.5rem !important; font-weight: 900 !important; margin-top: 1.5rem !important; margin-bottom: 0.75rem !important; line-height: 1.1 !important; color: white !important; }
        .ProseMirror h2, .ProseMirror .h2 { font-size: 2rem !important; font-weight: 800 !important; margin-top: 1.25rem !important; margin-bottom: 0.5rem !important; color: white !important; }
        .ProseMirror h3, .ProseMirror .h3 { font-size: 1.5rem !important; font-weight: 700 !important; margin-top: 1rem !important; margin-bottom: 0.5rem !important; color: white !important; }
        .ProseMirror h4, .ProseMirror .h4 { font-size: 1.25rem !important; font-weight: 700 !important; margin-top: 0.75rem !important; margin-bottom: 0.25rem !important; color: white !important; }
        .ProseMirror h5, .ProseMirror .h5 { font-size: 1.1rem !important; font-weight: 600 !important; margin-top: 0.5rem !important; margin-bottom: 0.25rem !important; color: white !important; }
        .ProseMirror h6, .ProseMirror .h6 { font-size: 1rem !important; font-weight: 600 !important; margin-top: 0.5rem !important; margin-bottom: 0.25rem !important; color: white !important; }
        .ProseMirror p { margin-bottom: 0.75rem; line-height: 1.6; color: rgba(255, 255, 255, 0.8); }
        .ProseMirror blockquote { border-left: 4px solid #3b82f6; padding-left: 1rem; margin-left: 0; margin-right: 0; font-style: italic; color: rgba(255, 255, 255, 0.6); }
        .ProseMirror pre { background: #1a1a1a; border: 1px solid rgba(255, 255, 255, 0.1); padding: 1rem; border-radius: 0.75rem; font-family: 'JetBrains Mono', monospace; overflow-x: auto; margin-bottom: 1rem; }
        .ProseMirror code { background: rgba(255, 255, 255, 0.1); padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: 'JetBrains Mono', monospace; font-size: 0.9em; }
        .ProseMirror pre code { background: none; padding: 0; border-radius: 0; }

        .ProseMirror img { 
          max-width: 100%; 
          border-radius: 1rem; 
          margin: 1rem 0; 
          user-select: none;
          -webkit-user-drag: none;
          pointer-events: auto;
        }
        .ProseMirror img::selection { background: transparent; }
        
        .ProseMirror video, .ProseMirror audio {
          user-select: none;
          -webkit-user-drag: none;
          max-width: 100%;
          border-radius: 1rem;
          margin: 1rem 0;
        }

        .image-placeholder {
          background: rgba(255, 255, 255, 0.05);
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 1.5rem;
          padding: 2.5rem;
          text-align: center;
          color: rgba(255, 255, 255, 0.4);
          cursor: pointer;
          margin: 1.5rem 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .image-placeholder:hover {
          background: rgba(59, 130, 246, 0.05);
          border-color: rgba(59, 130, 246, 0.4);
          color: rgba(59, 130, 246, 0.8);
          transform: translateY(-2px);
        }
        .image-placeholder:active {
          transform: translateY(0);
        }

        details {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0.75rem;
          margin-bottom: 1rem;
          background: rgba(255, 255, 255, 0.02);
        }
        summary {
          font-weight: bold;
          cursor: pointer;
          outline: none;
          color: #3b82f6;
        }
        details > div {
          margin-top: 0.5rem;
          padding-left: 1rem;
          border-left: 2px solid rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
