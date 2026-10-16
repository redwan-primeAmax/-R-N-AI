/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { DataManager } from '../services/storage/DataManager';
import { downloadBlob } from '../utils/downloadBlob';
import { notify } from '../utils/notify';

export type BackupStatus = 'idle' | 'preparing' | 'success' | 'error';

export function useBackupRestore() {
  const [status, setStatus] = useState<BackupStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<string | null>(null);
  const generation = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const begin = () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    return ++generation.current;
  };
  useEffect(() => () => {
    generation.current++;
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);


  const handleExport = async (options: { saveInternal?: boolean } = {}) => {
    const id = begin();
    setStatus('preparing');
    setError(null);
    try {
      const encryptedData = await DataManager.exportAllData();
      if (options.saveInternal) {
        await DataManager.saveInternalBackup(encryptedData);
      }
      if (id !== generation.current) return;
      downloadBlob(encryptedData, `backup-${Date.now()}.redwan`);
      setStatus('success');
      resetTimer.current = setTimeout(() => { if (id === generation.current) setStatus('idle'); }, 3000);
    } catch (err) {
      if (id !== generation.current) return;
      console.error('Export error:', err);
      setError('ব্যাকআপ তৈরি করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = begin();
    setStatus('preparing');
    setError(null);
    try {
      const data = await file.text();
      if (id !== generation.current) return;
      setImportData(data);
      e.target.value = ''; // Selecting the same file again must fire change.

    } catch (err) {
      if (id !== generation.current) return;
      console.error('Import error:', err);
      setError('ব্যাকআপ ফাইল পড়তে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const confirmRestore = async () => {
    if (!importData) return;
    const id = begin();
    setStatus('preparing');
    try {
      await DataManager.importAllData(importData);
      if (id !== generation.current) return;
      setStatus('success');
      setImportData(null);
      notify('সফলভাবে রিস্টোর হয়েছে!', 'success');
    } catch (err) {
      if (id !== generation.current) return;
      console.error('Restore error:', err);
      setError('রিস্টোর করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const reset = () => {
    begin();
    setImportData(null);
    setStatus('idle');
    setError(null);
  };

  return {
    status,
    error,
    importData,
    handleExport,
    handleImport,
    confirmRestore,
    reset,
    isConfirmOpen: importData !== null,
  };
}
