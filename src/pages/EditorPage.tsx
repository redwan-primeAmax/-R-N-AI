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
import { 
  ArrowLeft, Bold, Italic, Underline as UnderlineIcon, 
  List, ListOrdered, CheckSquare, Quote, Code, 
  Highlighter, AlignLeft, AlignCenter, AlignRight, Type, 
  Minus, Palette, Menu, Download, Mic, MicOff, Heading, Trash2, Sparkles, Loader2, UploadCloud, Copy, AlertCircle
} from 'lucide-react';
import EditorMenu from '../components/EditorMenu';
import { DataManager, Note } from '../utils/DataManager';
import { motion, AnimatePresence } from 'motion/react';
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
        codeBlock: false, // Disable default to use custom or just allow HTML
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
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      // Backup to localStorage immediately on change
      if (id) {
        localStorage.setItem(BACKUP_KEY, content);
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

  const confirmDeleteNote = async () => {
    if (note) {
      await DataManager.deleteNote(note.id);
      navigate('/');
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
      
      // Check for backup in localStorage
      const backup = localStorage.getItem(BACKUP_KEY);
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
    if (note) {
      setIsSaving(true);
      const updatedNote = { ...note, title, content, emoji, updatedAt: Date.now() };
      await DataManager.saveNote(updatedNote);
      // Clear backup after successful save
      localStorage.removeItem(BACKUP_KEY);
      setTimeout(() => setIsSaving(false), 1000);
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

  if (!editor) return null;

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    className = "" 
  }: { 
    onClick: (e: React.MouseEvent) => void; 
    isActive?: boolean; 
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className={cn(
        "p-2 rounded-lg flex-shrink-0 transition-colors duration-200",
        isActive ? "bg-[#333333] text-white" : "text-white/40 hover:bg-[#2a2a2a]",
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
        <button onClick={() => navigate('/main')} className="p-1.5 text-white/40 hover:text-white">
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
      <main className="pt-16 px-6 max-w-2xl mx-auto">
        <EditorContent editor={editor} className="focus:outline-none min-h-[50vh] pb-10" />
      </main>

      {/* Sticky Toolbar for Keyboard */}
      <div 
        className="fixed left-0 right-0 z-50 bg-[#1a1a1a] border-t border-white/10 shadow-2xl"
        style={{ bottom: keyboardHeight > 0 ? keyboardHeight : '0px' }}
      >
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

        {/* Main Toolbar */}
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar bg-[#1a1a1a]">
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
            <Bold size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
            <Italic size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
            <UnderlineIcon size={20} />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />
          
          <ToolbarButton 
            onClick={cycleHeading} 
            isActive={editor.isActive('heading', { level: currentHeading })}
          >
            <div className="relative flex items-center justify-center">
              <Heading size={20} />
              <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-black text-white rounded-full w-3 h-3 flex items-center justify-center">
                {currentHeading}
              </span>
            </div>
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
            <List size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
            <ListOrdered size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')}>
            <CheckSquare size={20} />
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}>
            <Quote size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')}>
            <Code size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setShowHighlightMenu(!showHighlightMenu)} isActive={showHighlightMenu || editor.isActive('highlight')}>
            <div className="relative">
              <Highlighter size={20} />
              <div 
                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white"
                style={{ backgroundColor: editor.getAttributes('highlight').color || '#ffcc00' }}
              />
            </div>
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={(e) => { isListening ? stopListening(e) : startListening(e); }} isActive={isListening} className={isListening ? "animate-pulse bg-red-50 text-red-500" : ""}>
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </ToolbarButton>

          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>
            <AlignLeft size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>
            <AlignCenter size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}>
            <AlignRight size={20} />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-gray-200 mx-1 flex-shrink-0" />
          
          <ToolbarButton onClick={() => setShowFontMenu(!showFontMenu)} isActive={showFontMenu}>
            <Type size={20} />
          </ToolbarButton>
          <ToolbarButton onClick={() => setShowColorMenu(!showColorMenu)} isActive={showColorMenu}>
            <div className="relative">
              <Palette size={20} />
              <div 
                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white"
                style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000' }}
              />
            </div>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={20} />
          </ToolbarButton>
        </div>
      </div>

      {/* CSS for Tiptap and no-scrollbar */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .ProseMirror { outline: none; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        ul[data-type="taskList"] { list-style: none; padding: 0; }
        ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
        ul[data-type="taskList"] li > label { user-select: none; margin-top: 0.25rem; }
        ul[data-type="taskList"] li > div { flex: 1; }
        input[type="checkbox"] { width: 1.25rem; height: 1.25rem; border-radius: 0.25rem; border: 2px solid #ddd; appearance: none; cursor: pointer; position: relative; }
        input[type="checkbox"]:checked { background-color: #000; border-color: #000; }
        input[type="checkbox"]:checked::after { content: '✓'; position: absolute; color: white; font-size: 0.75rem; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        
        .ProseMirror h1 { font-size: 2.25rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 0.75rem; line-height: 1.2; }
        .ProseMirror h2 { font-size: 1.875rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .ProseMirror h3 { font-size: 1.5rem; font-weight: 700; margin-top: 1rem; margin-bottom: 0.5rem; }
        .ProseMirror h4 { font-size: 1.25rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; }
        .ProseMirror h5 { font-size: 1.125rem; font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.25rem; }
        .ProseMirror h6 { font-size: 1rem; font-weight: 600; margin-top: 0.5rem; margin-bottom: 0.25rem; }
        .ProseMirror p { margin-bottom: 0.75rem; line-height: 1.6; color: rgba(255, 255, 255, 0.8); }
      `}</style>
    </div>
  );
}
