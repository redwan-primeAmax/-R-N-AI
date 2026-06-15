/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DataManager, Note } from '../../../services/storage/DataManager';
import { blocksToHtml } from '../components/CustomBlockEditor';
import { hashPassword } from '../../../utils/crypto';
import { loadThemeConfig } from '../themes/ThemeRegistry';
import { ThemeConfig } from '../themes/types';

interface UseEditorHandlersParams {
  id: string | undefined;
  note: Note | null;
  editor: any;
  title: string;
  emoji: string;
  description: string;
  theme: string;
  tags: string[];
  currentSubPages: Note[];
  collabRoom: string | null;
  setNote: (note: Note) => void;
  setTitle: (title: string) => void;
  setEmoji: (emoji: string) => void;
  setDescription: (desc: string) => void;
  setTags: (tags: string[]) => void;
  setTheme: (theme: string) => void;
  setNotification: (notif: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
  setIsReadOnly: (readOnly: boolean) => void;
  isReadOnly: boolean;
  saveNote: (content: string, urgent?: boolean) => void;
  titleRef: React.MutableRefObject<string>;
  emojiRef: React.MutableRefObject<string>;
  descriptionRef: React.MutableRefObject<string>;
  noteRef: React.MutableRefObject<Note | null>;
  themeRef: React.MutableRefObject<string>;
  blocksRef: React.MutableRefObject<any[]>;
  handleStartCollab: (options?: { password?: string; memberLimit?: number }) => Promise<void>;
  isDeletingRef?: React.MutableRefObject<boolean>;
}

export function useEditorHandlers({
  id,
  note,
  editor,
  title,
  emoji,
  description,
  theme,
  tags,
  currentSubPages,
  collabRoom,
  setNote,
  setTitle,
  setEmoji,
  setDescription,
  setTags,
  setTheme,
  setNotification,
  setIsReadOnly,
  isReadOnly,
  saveNote,
  titleRef,
  emojiRef,
  descriptionRef,
  noteRef,
  themeRef,
  blocksRef,
  handleStartCollab,
  isDeletingRef,
}: UseEditorHandlersParams) {
  const navigate = useNavigate();
  const location = useLocation();

  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [subPageMode, setSubPageMode] = useState<'attach' | 'create' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const [showTagPrompt, setShowTagPrompt] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [activeTheme, setActiveTheme] = useState<ThemeConfig | null>(null);
  const lastClickTime = useRef<number>(0);

  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPageEmojiPicker, setShowPageEmojiPicker] = useState(false);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Link Click Interception for Page Links (SPA navigation)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a.page-link');
      if (link) {
        e.preventDefault();
        const href = link.getAttribute('href');
        if (href) navigate(href);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [navigate]);

  useEffect(() => {
    const handleShowSubPageLinkList = () => setShowLinkPanel(true);
    window.addEventListener('editor-event-showSubPageLinkList', handleShowSubPageLinkList);
    return () => window.removeEventListener('editor-event-showSubPageLinkList', handleShowSubPageLinkList);
  }, []);

  useEffect(() => {
    if (theme) {
      loadThemeConfig(theme).then(setActiveTheme);
    }
  }, [theme]);

  useEffect(() => {
    (window as any).editorEvents = {
      emit: (event: string, data?: any) => {
        if (event === 'createSubPage') setSubPageMode('create');
        if (event === 'attachSubPage') setSubPageMode('attach');
      }
    };
    return () => { delete (window as any).editorEvents; };
  }, []);

  const handleLinkPageSelect = (targetNote: any) => {
    // Requirement 19: Insert link with arrow
    const linkHtml = `<a href="/editor/${targetNote.id}" class="page-link" data-note-id="${targetNote.id}"><span class="link-arrow">⤴</span> ${targetNote.title || 'শিরোনামহীন'}</a>`;
    document.execCommand('insertHTML', false, linkHtml);
    setShowLinkPanel(false);
  };

  const handleBack = async () => {
    if (isDeletingRef?.current) return;

    // Clear any pending save debounces and save instantly
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    
    // Use the latest content from the editor/refs
    const currentRefContent = blocksRef.current ? blocksToHtml(blocksRef.current) : editor.getHTML();
    await saveNote(currentRefContent, true);

    const now = Date.now();
    const collabParam = collabRoom ? `?collab=${collabRoom}` : '';

    // If double pressed within 300ms, go straight home
    if (now - lastClickTime.current < 300) {
      navigate(`/${collabParam}`);
      return;
    }
    lastClickTime.current = now;

    // Preferred logic: if we have a parent, go to it. Otherwise home.
    if (note?.parentId) {
      navigate(`/editor/${note.parentId}${collabParam}`, { replace: true });
    } else {
      navigate(`/${collabParam}`);
    }
  };

  const updateTitle = (newTitle: string) => {
    setTitle(newTitle);
    titleRef.current = newTitle;
    
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveNote(editor.getHTML());
    }, 1000);
  };

  const updateDescription = (newDesc: string) => {
    setDescription(newDesc);
    descriptionRef.current = newDesc;
    
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => {
      saveNote(editor.getHTML());
    }, 1500);
  };

  const updateEmoji = (newEmoji: string) => {
    setEmoji(newEmoji);
    emojiRef.current = newEmoji;
    
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    // Emoji is a single click, can save faster or instantly
    saveNote(editor.getHTML()); 
  };

  const handleDelete = async () => {
    if (isDeletingRef) {
      isDeletingRef.current = true;
    }
    
    // Clear any pending save timers
    if ((window as any)._autoSaveTimer) {
      clearTimeout((window as any)._autoSaveTimer);
    }

    try {
      const currentNote = noteRef.current || note!;
      if (currentNote) {
        // Force immediate navigation to prevent state updates on this page
        navigate('/', { replace: true });
        
        // Background delete
        await DataManager.deleteNote(currentNote.id).catch(console.error);
        
        // Clean up drafts
        localStorage.removeItem(`note_draft_${currentNote.id}`);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      navigate('/', { replace: true });
    }
  };

  const handleCopy = async () => {
    const currentNote = noteRef.current || note!;
    const currentContent = blocksToHtml(editor.blocks);
    const newNote = { 
      ...currentNote, 
      id: crypto.randomUUID(), 
      title: (currentNote.title || 'শিরোনামহীন') + ' (Copy)', 
      content: currentContent,
      isLocked: false,
      password: '',
      collabRoomId: '',
      isCollaborated: false,
      publishedCode: '',
      updatedAt: Date.now(), 
      createdAt: Date.now() 
    };
    await DataManager.saveNote(newNote);
    setNotification({ message: 'Note Duplicated', type: 'success' });
    setShowActionSheet(false);
    setTimeout(() => setNotification(null), 2000);
  };

  const handleLock = async (password: string) => {
    const trimmed = password.trim();
    if (trimmed) {
      const hashed = await hashPassword(trimmed);
      const currentNote = noteRef.current || note!;
      await DataManager.saveNote({ ...currentNote, isLocked: true, password: hashed, updatedAt: Date.now() });
      setNotification({ message: 'Page Locked', type: 'success' });
      setShowActionSheet(false);
      setTimeout(() => setNotification(null), 2000);
    }
  };

  const handleExport = () => {
    setShowActionSheet(false);
    setShowExportModal(true);
  };

  const handleTagSaveSubmit = (updatedTags: string[]) => {
    setTags(updatedTags);
    DataManager.saveNote({ ...note!, tags: updatedTags, updatedAt: Date.now() });
    setNotification({ message: 'ট্যাগ আপডেট করা হয়েছে', type: 'success' });
    setTimeout(() => setNotification(null), 2000);
  };

  const handleThemeSelect = (themeId: string) => {
    setTheme(themeId);
    themeRef.current = themeId;
    saveNote(editor.getHTML());
    
    // Optimistically update or wait for effect
    loadThemeConfig(themeId).then(setActiveTheme);
    
    setNotification({ message: 'Theme applied', type: 'success' });
    setTimeout(() => setNotification(null), 2000);
  };

  const handleAddSubPage = async () => {
    const newSub = await DataManager.createNote(note!.workspaceId || 'default', note!.id);
    navigate(`/editor/${newSub.id}`, { state: { fromParent: true } });
    setShowActionSheet(false);
  };

  const isLight = activeTheme ? ['snow-white', 'yellow-ruled', 'grid-paper', 'soft-linen'].includes(activeTheme.id) : false;
  const themeClass = activeTheme?.className || '';

  return {
    showActionSheet,
    setShowActionSheet,
    showBlockMenu,
    setShowBlockMenu,
    showThemeSelector,
    setShowThemeSelector,
    showCollaborationModal,
    setShowCollaborationModal,
    subPageMode,
    setSubPageMode,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showLockPrompt,
    setShowLockPrompt,
    showTagPrompt,
    setShowTagPrompt,
    showExportModal,
    setShowExportModal,
    showBookmarkModal,
    setShowBookmarkModal,
    activeTheme,
    isLight,
    themeClass,
    showLinkPanel,
    setShowLinkPanel,
    isTitleFocused,
    setIsTitleFocused,
    isUploading,
    setIsUploading,
    showPageEmojiPicker,
    setShowPageEmojiPicker,
    handleLinkPageSelect,
    handleBack,
    updateTitle,
    updateDescription,
    updateEmoji,
    handleDelete,
    handleCopy,
    handleLock,
    handleExport,
    handleTagSaveSubmit,
    handleThemeSelect,
    handleAddSubPage,
  };
}
