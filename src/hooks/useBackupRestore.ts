/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, ChangeEvent } from 'react';
import { DataManager } from '../services/storage/DataManager';
import { downloadBlob } from '../utils/downloadBlob';
import { notify } from '../utils/notify';

export type BackupStatus = 'idle' | 'preparing' | 'success' | 'error';

export function useBackupRestore() {
  const [status, setStatus] = useState<BackupStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [importData, setImportData] = useState<string | null>(null);

  const handleExport = async (options: { saveInternal?: boolean } = {}) => {
    setStatus('preparing');
    setError(null);
    try {
      const encryptedData = await DataManager.exportAllData();
      if (options.saveInternal) {
        await DataManager.saveInternalBackup(encryptedData);
      }
      downloadBlob(encryptedData, `backup-${Date.now()}.redwan`);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError('ব্যাকআপ তৈরি করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('preparing');
    setError(null);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        setImportData(data);
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Import error:', err);
      setError('ব্যাকআপ ফাইল পড়তে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const confirmRestore = async () => {
    if (!importData) return;
    try {
      await DataManager.importAllData(importData);
      setStatus('success');
      setImportData(null);
      notify('সফলভাবে রিস্টোর হয়েছে!', 'success');
    } catch (err) {
      console.error('Restore error:', err);
      setError('রিস্টোর করতে সমস্যা হয়েছে।');
      setStatus('error');
    }
  };

  const reset = () => {
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
