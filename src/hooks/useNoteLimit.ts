/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DataManager } from '../services/storage/DataManager';
import { DEFAULT_NOTE_LIMIT } from '../constants/defaults';

export function useNoteLimit(limit: number = DEFAULT_NOTE_LIMIT) {
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const checkLimit = async () => {
      try {
        const activeId = await DataManager.getActiveWorkspaceId();
        const counts = await DataManager.getNoteCountForWorkspaces();
        const count = counts[activeId] || 0;
        if (mounted) {
          setCurrentCount(count);
          setIsOverLimit(count >= limit);
        }
      } catch (err) {
        console.error('useNoteLimit error:', err);
      }
    };

    checkLimit();
    window.addEventListener('workspace-notes-changed', checkLimit);
    return () => {
      mounted = false;
      window.removeEventListener('workspace-notes-changed', checkLimit);
    };
  }, [limit]);

  return { isOverLimit, currentCount, limit };
}
