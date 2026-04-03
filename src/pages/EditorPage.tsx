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
  Minus, Palette, Menu, Download, Mic, MicOff, Heading, Trash2, Sparkles, Loader2
} from 'lucide-react';
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
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [isSuggestingTitle, setIsSuggestingTitle] = useState(false);
  const [hasSelectedTitle, setHasSelectedTitle] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentHeading, setCurrentHeading] = useState(1);

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
      if (note) {
        saveNote(editor.getHTML());
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

  // Title Suggestion Logic
  const handleSuggestTitles = async () => {
    if (!editor || isSuggestingTitle) return;
    
    setIsSuggestingTitle(true);
    try {
      const { AIService } = await import('../services/aiService');
      const suggestions = await AIService.suggestTitles(editor.getText());
      setTitleSuggestions(suggestions);
      setShowTitleSuggestions(true);
    } catch (err) {
      console.error("Failed to suggest titles", err);
      alert("Failed to get title suggestions. Please try again.");
    } finally {
      setIsSuggestingTitle(false);
    }
  };

  const selectTitle = (newTitle: string) => {
    updateTitle(newTitle);
    setShowTitleSuggestions(false);
    setHasSelectedTitle(true);
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
    
    // Handle keyboard positioning
    const handleResize = () => {
      if (window.visualViewport) {
        const height = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(height > 0 ? height : 0);
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, [id]);

  const loadNote = async (noteId: string) => {
    const fetchedNote = await DataManager.getNoteById(noteId);
    if (fetchedNote) {
      setNote(fetchedNote);
      setTitle(fetchedNote.title);
      setEmoji(fetchedNote.emoji);
      editor?.commands.setContent(fetchedNote.content);
    } else {
      navigate('/');
    }
  };

  const saveNote = async (content: string) => {
    if (note) {
      const updatedNote = { ...note, title, content, emoji, updatedAt: Date.now() };
      await DataManager.saveNote(updatedNote);
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
      DataManager.exportNote({ ...note, title, content: editor?.getHTML() || '' });
      setShowExportMenu(false);
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
        isActive ? "bg-gray-200 text-black" : "text-gray-500 hover:bg-gray-100",
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-1.5 text-gray-400 hover:text-black">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-grow flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="p-1.5 text-gray-400 hover:text-black">
              <Menu size={20} />
            </button>
            {showExportMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl p-1.5 z-50 min-w-[140px]">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 rounded-lg text-xs font-medium"
                >
                  <Download size={16} />
                  Export (.redwan)
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-50 text-red-500 rounded-lg text-xs font-medium mt-1"
                >
                  <Trash2 size={16} />
                  Delete Note
                </button>
              </div>
            )}
          </div>
          <button onClick={toggleEmoji} className="text-xl hover:scale-110 transition-transform">
            {emoji}
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Untitled"
            className="flex-grow bg-transparent font-bold text-base outline-none placeholder:text-gray-200 py-1"
          />
          {!hasSelectedTitle && (
            <button 
              onClick={handleSuggestTitles}
              disabled={isSuggestingTitle}
              className="p-1.5 text-black hover:bg-gray-100 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSuggestingTitle ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span className="text-[10px] font-bold uppercase tracking-wider">Suggest Title</span>
            </button>
          )}
        </div>
      </header>

      {/* Title Suggestions Popup */}
      <AnimatePresence>
        {showTitleSuggestions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Suggest Title</h3>
                <button onClick={() => setShowTitleSuggestions(false)} className="text-gray-400 hover:text-black">
                  <Minus size={20} />
                </button>
              </div>
              <p className="text-gray-500 text-sm mb-4">Choose a title suggested by AI based on your content:</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
                {titleSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectTitle(suggestion)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:border-black hover:bg-gray-50 transition-all text-sm font-medium"
                  >
                    {suggestion}
                  </button>
                ))}
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
      <main className="pt-16 px-6 max-w-2xl mx-auto">
        <EditorContent editor={editor} className="focus:outline-none min-h-[50vh] pb-10" />
      </main>

      {/* Sticky Toolbar for Keyboard */}
      <div 
        className="fixed left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-2xl"
        style={{ bottom: keyboardHeight > 0 ? keyboardHeight : '0px' }}
      >
        {/* Font & Color Submenus */}
        {showFontMenu && (
          <div className="bg-white border-b border-gray-100 p-2 flex gap-2 overflow-x-auto no-scrollbar">
            {FONTS.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  editor.chain().focus().setFontFamily(f.value).run();
                  setShowFontMenu(false);
                }}
                className="px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm whitespace-nowrap"
                style={{ fontFamily: f.value }}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}
        {showColorMenu && (
          <div className="bg-white border-b border-gray-100 p-2 flex gap-2 overflow-x-auto no-scrollbar">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  editor.chain().focus().setColor(c.value).run();
                  setShowColorMenu(false);
                }}
                className="w-8 h-8 rounded-full border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: c.value === 'inherit' ? '#fff' : c.value }}
              />
            ))}
          </div>
        )}
        {showHighlightMenu && (
          <div className="bg-white border-b border-gray-100 p-2 flex gap-2 overflow-x-auto no-scrollbar">
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
                className="w-8 h-8 rounded-full border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: c.value === 'inherit' ? '#fff' : c.value }}
              />
            ))}
          </div>
        )}

        {/* Main Toolbar */}
        <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar bg-white">
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
      `}</style>
    </div>
  );
}
