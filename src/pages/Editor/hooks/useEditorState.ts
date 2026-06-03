/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import localforage from 'localforage';

import { DataManager, Note } from '../../../services/storage/DataManager';
import { operationRunner } from '../../../services/storage/OperationRunner';
import { EditorBlock, htmlToBlocks, blocksToHtml } from '../../../utils/blockParser';
import { useEditorCommands } from './useEditorCommands';

export function useEditorState(id: string | undefined) {
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
      const next = typeof newBlocksVal === 'function' ? newBlocksVal(prev) : newBlocksVal;
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
    setHistoryPointer
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
      const content = blocksToHtml(blocks);
      
      if (content === lastSavedContentRef.current) return;
      
      if (id) localforage.setItem(BACKUP_KEY, content).catch(console.error);
      
      saveNote(content);
    }, 2000); // 2s debounce is highly efficient
  }, [blocks, id]);

  // Handle auto-save on unmount
  useEffect(() => {
    return () => {
      if (backupTimerRef.current) {
        clearTimeout(backupTimerRef.current);
      }
      
      const currentBlocks = blocksRef.current;
      if (currentBlocks.length > 0 && !isDeletingRef.current) {
        const content = blocksToHtml(currentBlocks);
        const hasChanges = 
          content !== lastSavedContentRef.current || 
          titleRef.current !== noteRef.current?.title ||
          emojiRef.current !== noteRef.current?.emoji ||
          descriptionRef.current !== noteRef.current?.description ||
          themeRef.current !== noteRef.current?.theme ||
          JSON.stringify(tagsRef.current) !== JSON.stringify(noteRef.current?.tags);

        if (hasChanges && noteRef.current) {
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
          }).catch(err => console.error('Auto-save on unmount failed:', err));
        }
      }
    };
  }, []);

  const loadNote = useCallback(async (noteId: string) => {
    const fetchedNote = await DataManager.getNoteById(noteId);
    
    // Check if we are joining a collaborative session via URL
    const searchParams = new URLSearchParams(location.search);
    const urlCollabId = searchParams.get('collab');

    if (fetchedNote) {
      setNote(fetchedNote);
      setTitle(fetchedNote.title);
      setEmoji(fetchedNote.emoji);
      setDescription(fetchedNote.description || '');
      setTags(fetchedNote.tags || []);
      setTheme(fetchedNote.theme || 'default');
      
      let content = fetchedNote.content;
      const backup = await localforage.getItem<string>(BACKUP_KEY);
      if (backup && backup !== fetchedNote.content) content = backup;
      
      const resolvedContent = await DataManager.resolveMediaUrls(content);
      lastSavedContentRef.current = resolvedContent;
      
      // Load blocks state
      setBlocks(htmlToBlocks(resolvedContent));

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
      if (isSaving && !force) return;
      
      // Dirty check
      if (!force && content === lastSavedContentRef.current && 
          titleRef.current === noteRef.current.title &&
          emojiRef.current === noteRef.current.emoji &&
          descriptionRef.current === noteRef.current.description &&
          themeRef.current === noteRef.current.theme &&
          JSON.stringify(tagsRef.current) === JSON.stringify(noteRef.current.tags)) {
        return;
      }

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
        await localforage.removeItem(BACKUP_KEY);
      } catch (err) {
        console.error('Save failed:', err);
      } finally {
        setTimeout(() => setIsSaving(false), 300);
      }
    }
  }, [isSaving, BACKUP_KEY]);

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
    titleRef, emojiRef, descriptionRef, noteRef, themeRef
  };
}
