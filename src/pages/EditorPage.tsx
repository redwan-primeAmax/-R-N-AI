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
  Undo, Redo, Image as ImageIcon, ChevronDown, Save, Video, Music, Settings, Lock, Unlock, Check,
  MoreVertical, Share2, Star, Files, History, Languages, ExternalLink, MessageSquare, Info, RotateCcw,
  Plus, X, Hash, Eye, EyeOff, MoreHorizontal
} from 'lucide-react';
import EditorMenu from '../components/EditorMenu';
import { DataManager, Note, NoteVersion } from '../utils/DataManager';
import { googleDriveService } from '../services/GoogleDriveService';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
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
  const [emoji, setEmoji] = useState('📄');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio'>('image');
  const [isListening, setIsListening] = useState(false);
  const [currentHeading, setCurrentHeading] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedCode, setPublishedCode] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [hasConflict, setHasConflict] = useState(false);

  // Use refs to avoid stale closures in callbacks
  const noteRef = useRef<Note | null>(null);
  const titleRef = useRef(title);
  const emojiRef = useRef(emoji);
  const backupTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
    emojiRef.current = emoji;
  }, [emoji]);

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
      // Calculate word count
      const text = editor.getText();
      const count = text.trim() ? text.trim().split(/\s+/).length : 0;
      setWordCount(count);

      // PERFORMANCE: Debounce backup to localforage for large notes
      if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
      
      backupTimerRef.current = setTimeout(() => {
        const content = editor.getHTML();
        if (id) {
          localforage.setItem(BACKUP_KEY, content).catch(err => {
            console.error('Backup failed:', err);
          });
        }
      }, 1000); // 1 second debounce for backups

      // Handle '>>' shortcut
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textContent;
      if (textBefore.endsWith('>>')) {
        editor.chain()
          .deleteRange({ from: $from.pos - 2, to: $from.pos })
          .insertContent('<pre style="background: #050505; color: white; padding: 1.5rem; border-radius: 1rem; font-family: monospace; border: 1px solid rgba(255,255,255,0.1);"><code> </code></pre>')
          .focus()
          .run();
      }
    },
  });

  const handlePublish = async () => {
    if (!note) {
      console.warn('EditorPage: Note not found in state!');
      return;
    }

    console.log('EditorPage: handlePublish clicked');
    setIsPublishing(true);
    setNotification({ message: publishedCode ? 'Updating cloud note...' : 'Publishing to cloud...', type: 'info' });

    try {
      const currentContent = editor?.getHTML() || '';
      console.log('EditorPage: HTML content extracted');
      
      if (publishedCode) {
        console.log('EditorPage: Updating existing published note:', publishedCode);
        await DataManager.updatePublishedNote({ ...note, content: currentContent });
        setNotification({ message: 'Update successful!', type: 'success' });
      } else {
        console.log('EditorPage: Publishing for the first time');
        const code = await DataManager.publishToSupabase({ ...note, content: currentContent });
        console.log('EditorPage: Generated code:', code);
        setPublishedCode(code);
        setNotification({ message: 'Published successfully!', type: 'success' });
        
        setTimeout(() => {
          console.log('EditorPage: Showing Share Modal');
          setPublishedCode(code); 
          setShowShareModal(true);
        }, 500);
      }
    } catch (e: any) {
      console.error('EditorPage: Publish Error:', e);
      const errMsg = e.message || String(e);
      setErrorMessage(errMsg);
      setShowErrorModal(true);
      setNotification(null);
      alert('Publish Failed: ' + errMsg);
    } finally {
      setIsPublishing(false);
      setTimeout(() => setNotification(null), 3000);
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
    const nextHeading = currentHeading >= 6 ? 1 : currentHeading + 1;
    setCurrentHeading(nextHeading);
    editor?.chain().focus().setHeading({ level: nextHeading as any }).run();
  };

  const clearSelection = () => {
    if (editor?.state.selection.empty) {
      editor?.chain().focus().deleteSelection().run();
    } else {
      editor?.chain().focus().deleteSelection().run();
    }
  };

  const fetchVersions = async () => {
    if (id) {
      const v = await DataManager.getVersions(id);
      setVersions(v);
    }
  };

  useEffect(() => {
    if (showVersionHistory) {
      fetchVersions();
    }
  }, [showVersionHistory]);

  const restoreVersion = async (v: NoteVersion) => {
    if (editor) {
      editor.commands.setContent(v.content);
      setTitle(v.title);
      setEmoji(v.emoji || '📄');
      setShowVersionHistory(false);
      setNotification({ message: 'Version Restored!', type: 'success' });
      setTimeout(() => setNotification(null), 1500);
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
    if (noteRef.current) {
      await DataManager.deleteNote(noteRef.current.id);
      handleBack();
    }
  };

  const reloadFromSource = async () => {
    if (id) {
      setHasConflict(false);
      await loadNote(id);
      setNotification({ message: 'Note reloaded from another tab.', type: 'info' });
      setTimeout(() => setNotification(null), 2000);
    }
  };

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

  const saveNote = async (content: string, force: boolean = false) => {
    if (noteRef.current && editor) {
      if (isSaving && !force) return;
      
      setIsSaving(true);
      try {
        const updatedTitle = titleRef.current || 'Untitled';
        const updatedEmoji = emojiRef.current || '📝';
        const updatedNote = await DataManager.saveNote({ 
          ...noteRef.current, 
          title: updatedTitle, 
          content, 
          emoji: updatedEmoji 
        });
        
        setNote(updatedNote);
        await localforage.removeItem(BACKUP_KEY);
      } catch (err) {
        console.error('Save failed:', err);
      } finally {
        setTimeout(() => setIsSaving(false), 300);
      }
    }
  };

  const updateEmoji = (newEmoji: string) => {
    setEmoji(newEmoji);
    if (noteRef.current) {
      const updatedNote = { ...noteRef.current, emoji: newEmoji, updatedAt: Date.now() };
      DataManager.saveNote(updatedNote);
      setNote(updatedNote);
    }
  };

  const updateTitle = async (newTitle: string) => {
    setTitle(newTitle);
    titleRef.current = newTitle; // Manual sync for immediate use
    if (noteRef.current && editor) {
      await saveNote(editor.getHTML(), true);
    }
  };

  const toggleEmoji = async () => {
    const emojis = ['📝', '💡', '🚀', '📚', '🎨', '🎯', '📅', '🔒', '⭐', '🔥'];
    const currentIndex = emojis.indexOf(emoji);
    const nextIndex = (currentIndex + 1) % emojis.length;
    const nextEmoji = emojis[nextIndex];
    setEmoji(nextEmoji);
    emojiRef.current = nextEmoji; // Manual sync
    if (noteRef.current && editor) {
      // Use the helper to stay in sync
      setTimeout(() => saveNote(editor.getHTML(), true), 0);
    }
  };

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

    // Prevent data loss on tab close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const content = editor?.getHTML() || '';
      if (noteRef.current && content !== noteRef.current.content) {
        // Save immediately
        DataManager.saveNote({
          ...noteRef.current,
          title: titleRef.current,
          emoji: emojiRef.current,
          content
        });
        
        // Show confirmation dialog (some browsers require this)
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Final save on unmount
      if (editor && noteRef.current) {
        const content = editor.getHTML();
        DataManager.saveNote({
          ...noteRef.current,
          title: titleRef.current,
          emoji: emojiRef.current,
          content
        });
      }
      clearInterval(autosaveInterval);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [editor, note, title, emoji]);

  useEffect(() => {
    if (id) {
      loadNote(id);
    }
    
    // Listen for sync events from other tabs
    const handleSync = (data: any) => {
      if (data.type === 'UPDATE_NOTE' && data.id === id && data.senderId !== DataManager.getClientId()) {
        // Instead of auto-loading, show conflict UI if user has local changes
        setHasConflict(true);
      } else if (data.type === 'DELETE_NOTE' && data.id === id) {
        navigate('/');
      }
    };
    
    const syncHandler = DataManager.onSync(handleSync);
    
    return () => {
      DataManager.offSync(syncHandler);
      if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    };
  }, [id, editor]);

  const handleExport = () => {
    if (noteRef.current) {
      DataManager.exportNoteAsTxt({ 
        ...noteRef.current, 
        title: titleRef.current, 
        content: editor?.getHTML() || '' 
      });
      setShowExportMenu(false);
    }
  };

  const handleCopyContent = () => {
    if (editor) {
      const text = editor.getText();
      navigator.clipboard.writeText(text).then(() => {
        setNotification({ message: 'Content copied to clipboard!', type: 'success' });
        setTimeout(() => setNotification(null), 2000);
      }).catch(() => {
        setNotification({ message: 'Failed to copy content', type: 'error' });
        setTimeout(() => setNotification(null), 2000);
      });
    }
  };

  const handleManualSave = async () => {
    if (noteRef.current && editor) {
      const content = editor.getHTML();
      await DataManager.saveVersion({ 
        ...noteRef.current, 
        noteId: noteRef.current.id,
        version: new Date().toISOString(),
        title: titleRef.current, 
        content, 
        emoji: emojiRef.current 
      });
      setNotification({ message: `Version saved!`, type: 'success' });
      setTimeout(() => setNotification(null), 2000);
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
      setNotification({ message: 'Uploading to Drive...', type: 'info' });
      
      try {
        const typeMapping: Record<string, 'Images' | 'Video' | 'Audio'> = {
          'image': 'Images',
          'video': 'Video',
          'audio': 'Audio'
        };

        const { id: fileId, url } = await googleDriveService.uploadMedia(file, typeMapping[mediaType] || 'Images', { 
          noteId: note.id 
        });

        // Add to media refs if needed
        const currentMediaRefs = note.mediaRefs || [];
        const newMediaRefs = [...currentMediaRefs, { driveId: fileId, localId: fileId, type: mediaType }];

        // Re-focus and insert at selection
        editor.chain().focus();
        
        if (mediaType === 'image') {
          editor.commands.setImage({ src: url });
        } else if (mediaType === 'video') {
          editor.commands.insertContent(`<video src="${url}" controls style="width: 100%; border-radius: 1rem; margin: 1rem 0;"></video>`);
        } else if (mediaType === 'audio') {
          editor.commands.insertContent(`<audio src="${url}" controls style="width: 100%; margin: 1rem 0;"></audio>`);
        }
        
        const newHtml = editor.getHTML();
        setNote({ ...note, content: newHtml, mediaRefs: newMediaRefs });
        
        // Manual sync
        setTimeout(() => saveNote(newHtml, true), 100);
        
        setNotification({ message: 'Saved to Cloud!', type: 'success' });
      } catch (err: any) {
        console.error('Media upload/insert error:', err);
        setErrorMessage(err.message || 'Failed to upload media');
        setShowErrorModal(true);
      } finally {
        setTimeout(() => setNotification(null), 3000);
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
    className = "",
    title,
    "aria-label": ariaLabel
  }: { 
    onClick: (e: React.MouseEvent) => void; 
    isActive?: boolean; 
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
    title?: string;
    "aria-label"?: string;
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      title={title}
      aria-label={ariaLabel}
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

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockPassword, setLockPassword] = useState('');

  const handleToggleLock = async () => {
    if (note) {
      const isLocked = !note.isLocked;
      const updatedNote = { ...note, isLocked: isLocked };
      await DataManager.saveNote(updatedNote);
      setNote(updatedNote);
      setNotification({ message: isLocked ? 'Note Locked!' : 'Note Unlocked!', type: 'success' });
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const MenuAction = ({ icon, label, onClick, danger = false }: { icon: React.ReactNode, label: string, onClick: () => void, danger?: boolean }) => (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]",
        danger ? "text-red-500 hover:bg-red-500/10" : "text-white/80 hover:bg-white/5"
      )}
    >
      <div className={cn("p-2 rounded-xl bg-white/5", danger && "bg-red-500/10")}>{icon}</div>
      <span className="font-bold text-[15px]">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#070707] text-white selection:bg-blue-500/30 font-sans">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-full text-[13px] font-bold shadow-2xl flex items-center gap-2 border bg-white text-black border-white/10"
          >
            {notification.type === 'info' && <Loader2 size={14} className="animate-spin text-blue-500" />}
            {notification.type === 'success' && <Check size={14} className="text-green-500" />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notion Style Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#070707]/60 backdrop-blur-3xl px-2 h-14 flex items-center justify-between">
        <div className="flex items-center gap-0">
          <motion.button 
            whileTap={{ scale: 0.9, x: -2 }}
            onClick={handleBack} 
            className="p-3 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </motion.button>
        </div>

        <div className="flex items-center gap-0">
           <button 
            onClick={handlePublish}
            disabled={isPublishing}
            className="p-3 text-white/60 hover:text-white transition-all active:scale-90 disabled:opacity-50"
            title="Publish"
           >
            {isPublishing ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
           </button>

           <button 
            onClick={() => {
              if (note) {
                const updated = { ...note, isFavorite: !note.isFavorite };
                DataManager.saveNote(updated);
                setNote(updated);
                setNotification({ message: updated.isFavorite ? 'Added to Favorites' : 'Removed from Favorites', type: 'success' });
                setTimeout(() => setNotification(null), 1500);
              }
            }}
            className={cn(
              "p-3 transition-all active:scale-90",
              note?.isFavorite ? "text-blue-400" : "text-white/60 hover:text-white"
            )}
           >
            <Star size={20} fill={note?.isFavorite ? "currentColor" : "none"} />
           </button>

           <button 
            onClick={() => setShowActionSheet(true)}
            className="p-3 text-white/60 hover:text-white transition-all active:scale-90"
           >
            <MoreHorizontal size={22} />
           </button>
        </div>
      </header>

      {/* Notion Content Area */}
      <main className="pt-16 pb-32 px-6 max-w-3xl mx-auto min-h-screen">
        {/* Emoji Selector Trigger */}
        <div className="mb-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-4xl hover:bg-white/5 p-2 rounded-2xl transition-colors -ml-2"
          >
            {emoji}
          </motion.button>
        </div>

        {/* Big Bold Title */}
        <div className="mb-8">
          <textarea
            value={title}
            onChange={(e) => {
              updateTitle(e.target.value);
              // Auto-resize textarea
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            placeholder="Untitled"
            rows={1}
            className="w-full bg-transparent text-4xl font-black focus:outline-none placeholder:text-white/10 text-white tracking-tight resize-none leading-tight"
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* Tiptap Editor */}
        <EditorContent 
          editor={editor} 
          className="prose prose-invert max-w-none focus:outline-none selection:bg-blue-500/30" 
        />
      </main>

      {/* Simple Emoji Picker Panel */}
      <AnimatePresence>
        {showEmojiPicker && (
          <div className="fixed inset-0 z-[100] flex items-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEmojiPicker(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full bg-[#121212] rounded-t-[32px] p-6 pb-12 border-t border-white/10"
            >
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-lg font-black uppercase tracking-widest text-white/40">Select Icon</h3>
                <button onClick={() => setShowEmojiPicker(false)} className="p-2 bg-white/5 rounded-full"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-6 gap-4 max-h-[300px] overflow-y-auto no-scrollbar pb-10 px-2">
                {['📄', '📝', '💡', '🗓️', '✅', '📌', '🚀', '⭐', '📁', '🔥', '🎨', '💻', '🌍', '📊', '⚡', '🤖', '📚', '🛠️'].map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      updateEmoji(e);
                      setShowEmojiPicker(false);
                    }}
                    className={cn(
                      "text-3xl p-3 rounded-2xl transition-all active:scale-75",
                      emoji === e ? "bg-blue-500" : "hover:bg-white/5"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Notion Action Sheet */}
      <AnimatePresence>
        {showActionSheet && (
          <div className="fixed inset-0 z-[120] flex items-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActionSheet(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="relative w-full bg-[#0c0c0c] rounded-t-[40px] p-2 border-t border-white/[0.05] pb-10 overflow-hidden shadow-2xl"
            >
              {/* Grab Handle */}
              <div className="flex justify-center py-4">
                <div className="w-12 h-1.5 bg-white/10 rounded-full" />
              </div>

              <div className="px-4 py-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                {/* Menu Header with Note Metadata */}
                <div className="flex items-center gap-4 mb-8 px-4 opacity-70">
                  <div className="text-4xl">{emoji}</div>
                  <div>
                    <h4 className="font-bold text-lg leading-none mb-1">{title || 'Untitled'}</h4>
                    <p className="text-xs text-white/40">{wordCount} words • {new Date(note?.updatedAt || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <MenuAction 
                    icon={<Share2 size={20} />} 
                    label="Share / Publish" 
                    onClick={() => {
                      setShowActionSheet(false);
                      handlePublish();
                    }}
                  />
                  <MenuAction 
                    icon={<Star size={20} fill={note?.isFavorite ? "currentColor" : "none"} />} 
                    label={note?.isFavorite ? "Remove from Favorites" : "Add to Favorites"} 
                    onClick={() => {
                      if (note) {
                        const updated = { ...note, isFavorite: !note.isFavorite };
                        DataManager.saveNote(updated);
                        setNote(updated);
                        setShowActionSheet(false);
                        setNotification({ message: updated.isFavorite ? 'Favorited' : 'Unfavorited', type: 'success' });
                        setTimeout(() => setNotification(null), 1500);
                      }
                    }}
                  />
                  <MenuAction 
                    icon={<Copy size={20} />} 
                    label="Duplicate Note" 
                    onClick={async () => {
                      if (note) {
                        const duplicate: Note = {
                          ...note,
                          id: `note-${Date.now()}`,
                          title: `${note.title} (Copy)`,
                          createdAt: Date.now(),
                          updatedAt: Date.now()
                        };
                        await DataManager.saveNote(duplicate);
                        setShowActionSheet(false);
                        navigate(`/editor/${duplicate.id}`);
                        setNotification({ message: 'Note Duplicated!', type: 'success' });
                        setTimeout(() => setNotification(null), 1500);
                      }
                    }}
                  />
                  
                  <div className="h-[1px] bg-white/5 my-4" />

                  <MenuAction 
                    icon={<History size={20} />} 
                    label="Version History" 
                    onClick={() => {
                      setShowActionSheet(false);
                      setShowVersionHistory(true);
                    }}
                  />
                  <MenuAction 
                    icon={<Lock size={20} />} 
                    label={note?.isLocked ? "Unlock Note" : "Lock with Password"} 
                    onClick={() => {
                      setShowActionSheet(false);
                      handleToggleLock();
                    }}
                  />
                  <MenuAction 
                    icon={<Download size={20} />} 
                    label="Export as .TXT" 
                    onClick={() => {
                      if (note) DataManager.exportNoteAsTxt({ ...note, content: editor?.getHTML() || '' });
                      setShowActionSheet(false);
                    }}
                  />
                  
                  <div className="h-[1px] bg-white/5 my-4" />

                  <MenuAction 
                    icon={<Trash2 size={20} />} 
                    label="Delete Note" 
                    danger
                    onClick={() => {
                      setShowActionSheet(false);
                      setShowDeleteConfirm(true);
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Version History Modal */}
      <Modal 
        isOpen={showVersionHistory} 
        onClose={() => setShowVersionHistory(false)} 
        title="Version History"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar py-2">
          {versions.length === 0 ? (
            <p className="text-center text-white/20 py-10">No previous versions found.</p>
          ) : (
            versions.map((v) => (
              <div 
                key={v.id} 
                className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 transition-all"
              >
                <div>
                  <p className="font-bold text-sm mb-1">{new Date(v.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-white/40">{v.title || 'Untitled'}</p>
                </div>
                <button 
                  onClick={() => restoreVersion(v)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  Restore
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Floating Interactive Toolbar (Notion Style) */}
      <div 
        className="fixed left-0 right-0 z-[60] transition-all duration-300 ease-out pointer-events-none"
        style={{ bottom: keyboardHeight > 0 ? keyboardHeight : '0px' }}
      >
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-1 p-1 bg-[#121212]/95 backdrop-blur-2xl border-t border-white/[0.05] overflow-x-auto no-scrollbar pointer-events-auto"
        >
          <div className="flex items-center px-4 border-r border-white/5 mr-1 text-white/30 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">
            Text Styles
          </div>

          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}>
            <Heading size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')}>
            <CheckSquare size={18} />
          </ToolbarButton>

          <div className="w-[1px] h-6 bg-white/5 mx-1 flex-shrink-0" />

          <ToolbarButton onClick={() => addMedia('image')}><ImageIcon size={18} /></ToolbarButton>
          <ToolbarButton onClick={() => addMedia('video')}><Video size={18} /></ToolbarButton>
          <ToolbarButton onClick={() => addMedia('audio')}><Music size={18} /></ToolbarButton>
          <ToolbarButton onClick={startListening} isActive={isListening} className={cn(isListening && "text-red-500 bg-red-500/10")}>
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </ToolbarButton>
          <ToolbarButton onClick={() => setShowActionSheet(true)}><Sparkles size={18} className="text-blue-500" /></ToolbarButton>
        </motion.div>
      </div>

      {/* Modals & Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Note?">
        <div className="p-2">
          <p className="text-white/40 text-sm mb-6">Are you sure you want to delete this note? This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold text-sm">Cancel</button>
            <button onClick={confirmDeleteNote} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-500/20">Delete</button>
          </div>
        </div>
      </Modal>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .ProseMirror { 
          outline: none; 
          font-size: 1.15rem; 
          line-height: 1.7;
          color: rgba(255,255,255,0.85);
          min-height: 50vh;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgba(255, 255, 255, 0.1);
          pointer-events: none;
          height: 0;
        }
        .ProseMirror h1 { @apply text-4xl font-black mb-6 mt-10 text-white tracking-tight leading-tight; }
        .ProseMirror h2 { @apply text-2xl font-bold mb-4 mt-8 text-white tracking-tight; }
        .ProseMirror p { margin-bottom: 1.25rem; }
        .ProseMirror li p { margin-bottom: 0.5rem; }
        .ProseMirror img, .ProseMirror video, .ProseMirror audio { 
          max-width: 100%; 
          border-radius: 20px; 
          margin: 1.5rem 0; 
          border: 1px solid rgba(255,255,255,0.05);
        }
        ul[data-type="taskList"] { list-style: none; padding: 0; }
        ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; }
        ul[data-type="taskList"] li > label { margin-top: 0.25rem; }
      `}</style>
    </div>
  );
}
