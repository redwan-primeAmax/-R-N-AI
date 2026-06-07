/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../../services/storage/DexieDB';

import { DataManager, Note } from '../../../services/storage/DataManager';
import { operationRunner } from '../../../services/storage/OperationRunner';
import { EditorBlock, htmlToBlocks, blocksToHtml } from '../../../utils/blockParser';
import { useEditorCommands } from './useEditorCommands';
import { extensionManager } from '../../../services/ExtensionManager';

export function useEditorState(id: string | undefined, blocksRefs?: React.MutableRefObject<Record<string, HTMLElement>>) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isUnlocked, setIsUnlocked] = useState(location.state?.authorized || false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('📄');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [theme, setTheme] = useState<string>('default');
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [activeTasksCount, setActiveTasksCount] = useState(0);
  const [workspaceName, setWorkspaceName] = useState('Workspace');
  const [parentNote, setParentNote] = useState<Note | null>(null);
  const [currentSubPages, setCurrentSubPages] = useState<Note[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);


  // Editor Blocks State
  const [blocks, setBlocksState] = useState<EditorBlock[]>([]);
  const blocksRef = useRef<EditorBlock[]>([]);

  const setBlocks = useCallback((newBlocksVal: any) => {
    setBlocksState((prev) => {
      let next = typeof newBlocksVal === 'function' ? newBlocksVal(prev) : newBlocksVal;
      // Extension Filter: onBlocksUpdate
      next = extensionManager.applyFilters('onBlocksUpdate', next);
      blocksRef.current = next;
      return next;
    });
  }, []);

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  const noteRef = useRef<Note | null>(null);
  const titleRef = useRef(title);
  const emojiRef = useRef(emoji);
  const descriptionRef = useRef(description);
  const tagsRef = useRef(tags);
  const themeRef = useRef(theme);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { emojiRef.current = emoji; }, [emoji]);
  useEffect(() => { descriptionRef.current = description; }, [description]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);
  useEffect(() => { themeRef.current = theme; }, [theme]);
  const backupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isDeletingRef = useRef(false);

  const lastSavedContentRef = useRef('');
  const [forceRefreshState, setForceRefreshState] = useState({});

  // History state for UI update
  const [historyPointer, setHistoryPointer] = useState(0);
  const historyRef = useRef<EditorBlock[][]>([[]]);
  
  useEffect(() => {
    // Push history item if blocks change and we're not currently undoing/redoing
    // We debounce this to capture data every 2 seconds as requested
    const lastHistory = historyRef.current[historyPointer];
    if (JSON.stringify(blocks) !== JSON.stringify(lastHistory)) {
      const timer = setTimeout(() => {
        // truncate future history
        const newHistory = historyRef.current.slice(0, historyPointer + 1);
        newHistory.push(blocks);
        // keep at most 50 steps
        if (newHistory.length > 50) newHistory.shift();
        historyRef.current = newHistory;
        setHistoryPointer(newHistory.length - 1);
      }, 2000); // 2000ms debounce
      return () => clearTimeout(timer);
    }
  }, [blocks, historyPointer]);

  useEffect(() => { noteRef.current = note; }, [note]);

  const BACKUP_KEY = `note_backup_${id}`;

  const savePreviousNoteIfNeeded = useCallback(async (prevId: string) => {
    const currentBlocks = blocksRef.current;
    const currentNote = noteRef.current;
    
    if (currentNote && currentNote.id === prevId && currentBlocks.length > 0 && !isDeletingRef.current) {
      const content = blocksToHtml(currentBlocks);
      const isContentDiff = content !== lastSavedContentRef.current;
      const isTitleDiff = titleRef.current !== currentNote.title;
      const isEmojiDiff = emojiRef.current !== currentNote.emoji;
      const isDescDiff = descriptionRef.current !== (currentNote.description || '');
      const isThemeDiff = themeRef.current !== (currentNote.theme || 'default');
      const isTagsDiff = JSON.stringify(tagsRef.current) !== JSON.stringify(currentNote.tags || []);
      
      const hasChanges = isContentDiff || isTitleDiff || isEmojiDiff || isDescDiff || isThemeDiff || isTagsDiff;

      if (hasChanges) {
        const updatedTitle = titleRef.current || 'শিরোনামহীন';
        const updatedEmoji = emojiRef.current || '📝';
        
        try {
          await DataManager.saveNote({
            ...currentNote,
            title: updatedTitle,
            content,
            emoji: updatedEmoji,
            description: descriptionRef.current,
            tags: tagsRef.current,
            theme: themeRef.current
          });
          lastSavedContentRef.current = content;
          console.log(`Saved previous note ${prevId} successfully.`);
        } catch (err) {
          console.error('Failed to save previous note:', err);
        }
      }
    }
  }, []);

  // Simple local search engine mimicking Tiptap's search & replace storage
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      setSearchIndex(0);
      return;
    }
    const results: any[] = [];
    blocks.forEach((block, bIdx) => {
      if (block.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push({ blockId: block.id, blockIdx: bIdx });
      }
    });
    setSearchResults(results);
    setSearchIndex(0);
  }, [searchTerm, blocks]);

  // Create Tiptap compat-shim controller via modular hook
  const editor = useEditorCommands({
    blocks,
    setBlocks,
    activeBlockId,
    setActiveBlockId,
    isReadOnly,
    searchTerm,
    setSearchTerm,
    searchResults,
    searchIndex,
    setSearchIndex,
    setForceRefreshState,
    historyRef,
    historyPointer,
    setHistoryPointer,
    blocksRefs
  });

  // Trigger search transaction events
  useEffect(() => {
    editor.triggerEvent('transaction');
  }, [searchResults, searchIndex]);

  // Debounced auto-save triggers whenever blocks update
  useEffect(() => {
    if (blocks.length === 0) return;
    
    if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    backupTimerRef.current = setTimeout(() => {
      let filteredBlocks = blocks;
      // Extension Filter: beforeSave
      filteredBlocks = extensionManager.applyFilters('beforeSave', filteredBlocks);
      const content = blocksToHtml(filteredBlocks);
      
      if (content === lastSavedContentRef.current) return;
      
      if (id) db.key_value_pairs.put({ key: BACKUP_KEY, value: content }).catch(console.error);
      
      saveNote(content);
    }, 2000); // 2s debounce is highly efficient
  }, [blocks, id]);

  // Asynchronous secure hot-backup of current draft state to localStorage (immediate & immune to exit data loss)
  useEffect(() => {
    if (!id || blocks.length === 0) return;
    
    const draftData = {
      blocks,
      title: titleRef.current,
      emoji: emojiRef.current,
      description: descriptionRef.current,
      tags: tagsRef.current,
      theme: themeRef.current,
      timestamp: Date.now()
    };
    
    DataManager.encryptValue(JSON.stringify(draftData)).then((encrypted) => {
      try {
        localStorage.setItem(`note_draft_${id}`, encrypted);
      } catch (e) {
        console.warn('LocalStorage draft write error:', e);
      }
    }).catch(console.error);
  }, [blocks, title, emoji, description, tags, theme, id]);

  // Instant hot-save on tab close / tab hide / unload (Diamond Road security logic)
  useEffect(() => {
    if (!id) return;
    const handleVisibilityOrUnload = () => {
      const currentBlocks = blocksRef.current;
      if (currentBlocks.length > 0 && !isDeletingRef.current && noteRef.current) {
        const content = blocksToHtml(currentBlocks);
        const hasChanges = 
          content !== lastSavedContentRef.current || 
          titleRef.current !== noteRef.current?.title ||
          emojiRef.current !== noteRef.current?.emoji ||
          descriptionRef.current !== noteRef.current?.description ||
          themeRef.current !== noteRef.current?.theme ||
          JSON.stringify(tagsRef.current) !== JSON.stringify(noteRef.current?.tags);

        if (hasChanges) {
          const currentNote = noteRef.current;
          const updatedTitle = titleRef.current || 'শিরোনামহীন';
          const updatedEmoji = emojiRef.current || '📝';
          
          DataManager.saveNote({
            ...currentNote,
            title: updatedTitle,
            content,
            emoji: updatedEmoji,
            description: descriptionRef.current,
            tags: tagsRef.current,
            theme: themeRef.current
          }).then(() => {
            lastSavedContentRef.current = content;
            localStorage.removeItem(`note_draft_${id}`);
          }).catch(err => console.error('Emergency save failed:', err));
        }
      }
    };

    window.addEventListener('beforeunload', handleVisibilityOrUnload);
    document.addEventListener('visibilitychange', handleVisibilityOrUnload);

    return () => {
      window.removeEventListener('beforeunload', handleVisibilityOrUnload);
      document.removeEventListener('visibilitychange', handleVisibilityOrUnload);
    };
  }, [id]);

  // Handle auto-save on unmount
  useEffect(() => {
    return () => {
      if (backupTimerRef.current) {
        clearTimeout(backupTimerRef.current);
      }
      
      const currentBlocks = blocksRef.current;
      if (currentBlocks.length > 0 && !isDeletingRef.current && noteRef.current) {
        const content = blocksToHtml(currentBlocks);
        const hasChanges = 
          content !== lastSavedContentRef.current || 
          titleRef.current !== noteRef.current?.title ||
          emojiRef.current !== noteRef.current?.emoji ||
          descriptionRef.current !== noteRef.current?.description ||
          themeRef.current !== noteRef.current?.theme ||
          JSON.stringify(tagsRef.current) !== JSON.stringify(noteRef.current?.tags);

        if (hasChanges) {
          const currentNote = noteRef.current;
          const updatedTitle = titleRef.current || 'শিরোনামহীন';
          const updatedEmoji = emojiRef.current || '📝';
          
          DataManager.saveNote({
            ...currentNote,
            title: updatedTitle,
            content,
            emoji: updatedEmoji,
            description: descriptionRef.current,
            tags: tagsRef.current,
            theme: themeRef.current
          }).then(() => {
            if (id) localStorage.removeItem(`note_draft_${id}`);
          }).catch(err => console.error('Auto-save on unmount failed:', err));
        }
      }
    };
  }, [id]);

  const loadNote = useCallback(async (noteId: string) => {
    // 1. Reset state to trigger LoadingScreen immediately on ID change
    setNote(null);
    setBlocksState([]);
    setTitle('');
    
    if (noteRef.current && noteRef.current.id !== noteId) {
      await savePreviousNoteIfNeeded(noteRef.current.id);
    }
    const fetchedNote = await DataManager.getNoteById(noteId);
    
    // Check if we are joining a collaborative session via URL
    const searchParams = new URLSearchParams(location.search);
    const urlCollabId = searchParams.get('collab');

    if (fetchedNote) {
      setNote(fetchedNote);

      let titleVal = fetchedNote.title;
      let emojiVal = fetchedNote.emoji;
      let descVal = fetchedNote.description || '';
      let tagsVal = fetchedNote.tags || [];
      let themeVal = fetchedNote.theme || 'default';
      let contentVal = fetchedNote.content;

      // Hot draft recovery check (Diamond Road Data Integrity validation)
      const rawDraftStr = localStorage.getItem(`note_draft_${noteId}`);
      let draftStr = '';
      if (rawDraftStr) {
        if (rawDraftStr.startsWith('{')) {
          draftStr = rawDraftStr;
        } else {
          try {
            draftStr = await DataManager.decryptValue(rawDraftStr);
          } catch (e) {
            console.error('Failed to decrypt hot draft:', e);
          }
        }
      }
      let draftRestored = false;
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          // Only restore if draft is strictly newer AND content differs to avoid false positives
          const isNewer = draft && draft.timestamp > (fetchedNote.updatedAt || 0) + 1000;
          if (isNewer && draft.blocks && draft.blocks.length > 0) {
            const draftHtml = blocksToHtml(draft.blocks);
            if (draftHtml !== fetchedNote.content) {
              titleVal = draft.title || fetchedNote.title;
              emojiVal = draft.emoji || fetchedNote.emoji;
              descVal = draft.description || fetchedNote.description || '';
              tagsVal = draft.tags || fetchedNote.tags || [];
              themeVal = draft.theme || fetchedNote.theme || 'default';
              contentVal = draftHtml;
              draftRestored = true;
            } else {
              // Draft matches disk exactly, just silent cleanup
              if (noteId) localStorage.removeItem(`note_draft_${noteId}`);
            }
          }
        } catch (e) {
          console.error('Failed to restore hot draft:', e);
        }
      }

      setTitle(titleVal);
      setEmoji(emojiVal);
      setDescription(descVal);
      setTags(tagsVal);
      setTheme(themeVal);
      
      let content = contentVal;
      if (!draftRestored) {
        const backupRecord = await db.key_value_pairs.get(BACKUP_KEY);
        const backup = backupRecord ? backupRecord.value as string : null;
        if (backup && backup !== fetchedNote.content) content = backup;
      }
      
      const resolvedContent = await DataManager.resolveMediaUrls(content);
      lastSavedContentRef.current = resolvedContent;
      
      // Load blocks state
      let initialBlocks = htmlToBlocks(resolvedContent);
      // Extension Filter: onLoad
      initialBlocks = extensionManager.applyFilters('onLoad', initialBlocks);
      setBlocks(initialBlocks);

      const workspaces = await DataManager.getWorkspaces();
      const ws = workspaces.find(w => w.id === (fetchedNote.workspaceId || 'default'));
      if (ws) setWorkspaceName(ws.name);

      const allNotes = await DataManager.getAllNotes();
      setCurrentSubPages(allNotes.filter(n => n.parentId === fetchedNote.id && !n.isTrashed && n.id !== fetchedNote.id));

      if (fetchedNote.parentId) {
        DataManager.getNoteById(fetchedNote.parentId).then(setParentNote);
      } else {
        setParentNote(null);
      }

      if (draftRestored) {
        setNotification({ message: 'অসংরক্ষিত ড্রাফট উদ্ধার করা হয়েছে (Unsaved draft restored!)', type: 'info' });
        setTimeout(() => setNotification(null), 3000);
      }
    } else if (urlCollabId) {
      // Create a temporary/placeholder note locally so the editor does not redirect,
      // and let the in-flight Yjs real-time updates overwrite and save it automatically as soon as it syncs.
      const activeWorkspaceId = (await DataManager.getActiveWorkspaceId()) || 'default-workspace';
      const tempNote: Note = {
        id: noteId,
        title: 'Connecting to collaboration...',
        emoji: '🔄',
        description: 'Synchronizing with host...',
        content: '<p>Getting document real-time data from peer host...</p>',
        theme: 'default',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isTrashed: false,
        workspaceId: activeWorkspaceId
      };
      
      await DataManager.saveNote(tempNote);
      
      setNote(tempNote);
      setTitle(tempNote.title);
      setEmoji(tempNote.emoji);
      setDescription(tempNote.description || '');
      setTags(tempNote.tags || []);
      setTheme(tempNote.theme || 'default');
      setBlocks(htmlToBlocks(tempNote.content));
    } else {
      navigate('/');
    }
  }, [id, navigate, BACKUP_KEY, location.search]);

  const saveNote = useCallback(async (content: string, force: boolean = false) => {
    if (noteRef.current) {
      if (isSavingRef.current && !force) return;
      
      // Dirty check
      if (!force && content === lastSavedContentRef.current && 
          titleRef.current === noteRef.current.title &&
          emojiRef.current === noteRef.current.emoji &&
          descriptionRef.current === noteRef.current.description &&
          themeRef.current === noteRef.current.theme &&
          JSON.stringify(tagsRef.current) === JSON.stringify(noteRef.current.tags)) {
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);
      try {
        const updatedTitle = titleRef.current || 'শিরোনামহীন';
        const updatedEmoji = emojiRef.current || '📝';
        const updatedNote = await DataManager.saveNote({ 
          ...noteRef.current, 
          title: updatedTitle, 
          content, 
          emoji: updatedEmoji,
          description: descriptionRef.current,
          tags: tagsRef.current,
          theme: themeRef.current
        });
        
        lastSavedContentRef.current = updatedNote.content;
        setNote(updatedNote);
        
        // Immediate robust cleanup of all temporary buffers
        await db.key_value_pairs.delete(BACKUP_KEY);
        if (id) localStorage.removeItem(`note_draft_${id}`);
      } catch (err) {
        console.error('Save failed:', err);
      } finally {
        setTimeout(() => {
          isSavingRef.current = false;
          setIsSaving(false);
        }, 300);
      }
    }
  }, [BACKUP_KEY, id]);

  useEffect(() => {
    const unsub = operationRunner.subscribe(() => {
      setActiveTasksCount(operationRunner.getActiveTasksCount());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (id) loadNote(id);
  }, [id, loadNote]);

  const startListening = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            editor.commands.insertContent(event.results[i][0].transcript + ' ');
          }
        }
      };
      recognition.start();
      (window as any).recognition = recognition;
    } catch (err) {
      setNotification({ message: "Microphone access required.", type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const stopListening = () => {
    if ((window as any).recognition) {
      (window as any).recognition.stop();
      setIsListening(false);
    }
  };

  return {
    editor, note, setNote, title, setTitle, emoji, setEmoji, description, setDescription, 
    tags, setTags, theme, setTheme, isSaving, 
    activeTasksCount, workspaceName, parentNote, currentSubPages, setCurrentSubPages, isListening,
    notification, setNotification, isReadOnly, setIsReadOnly, isUnlocked, setIsUnlocked,
    saveNote, startListening, stopListening, loadNote, isDeletingRef, 
    titleRef, emojiRef, descriptionRef, noteRef, themeRef, blocksRef
  };
}
