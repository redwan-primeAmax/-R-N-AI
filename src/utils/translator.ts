/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * translator.ts — dedicated localization module.
 *
 * Single source of truth for every user-facing string that switches
 * between English (`en`) and Bengali (`bn`). Components should never
 * hard-code a bilingual string inline; add a key here instead and read
 * it through `t()` / `useLanguage()`.
 *
 * Persistence: the choice is stored in `localStorage` (synchronous, so
 * the first paint already uses the right language) and mirrored by the
 * caller into `UserPreferences` (IndexedDB) so backup/restore keeps it.
 * Changing the language dispatches `app-language-changed` on `window`,
 * which `useLanguage()` listens to — every mounted screen re-renders
 * in the new language without a reload.
 */

import { useCallback, useEffect, useState } from 'react';

export type AppLanguage = 'en' | 'bn';

export const LANGUAGE_STORAGE_KEY = 'app_language';
export const LANGUAGE_CHANGED_EVENT = 'app-language-changed';
export const DEFAULT_LANGUAGE: AppLanguage = 'bn';
export const DEFAULT_MODEL_ID = 'gemini-1.5-flash';
export const DEFAULT_MODEL_LABEL = 'Gemini 1.5 Flash';

export const LANGUAGE_OPTIONS: { value: AppLanguage; label: string; nativeLabel: string }[] = [
  { value: 'en', label: 'English', nativeLabel: 'English' },
  { value: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
];

const en = {
  // Navigation / Sidebar
  'nav.agent': 'Agent',
  'nav.bookmarks': 'Bookmarks',
  'nav.vault': 'Security Vault',
  'nav.tools': 'Tools',
  'nav.settings': 'Settings',
  'nav.recycleBin': 'Recycle Bin',
  'nav.notes': 'Notes',
  'nav.search': 'Search',
  'nav.appMenu': 'App Menu',
  'nav.recentNotes': 'Recent 3 Notes',
  'nav.favorites': '★ Favorite Notes',
  'nav.noNotes': 'No notes found',
  'nav.untitled': 'Untitled',
  'nav.newPage': 'New Page',
  'nav.tapToSwitchWorkspace': 'Tap to switch workspace',
  'nav.close': 'Close',

  // Common
  'common.back': 'Back',
  'common.cancel': 'Cancel',

  // Home
  'home.pages': 'Pages ({count})',
  'home.grid': 'Grid',
  'home.layer': 'Layer',
  'home.gridMode': 'Grid Mode (2-column grid)',
  'home.layerMode': 'Layer Mode (single column list)',
  'home.noNotes': 'No notes found',
  'home.loadingMore': 'Loading more notes…',

  // Settings
  'settings.title': 'Settings',
  'settings.subtitle': 'App Settings',
  'settings.aiSection': 'AI & Intelligence',
  'settings.dataSection': 'Data & Storage',
  'settings.preferencesSection': 'Preferences',
  'settings.dangerZone': 'Danger Zone',
  'settings.aiConfig': 'AI Configuration',
  'settings.aiConfigDesc': 'Set up API keys and model controls.',
  'settings.dataMonitor': 'Data Monitor',
  'settings.dataMonitorDesc': 'Check storage usage and backup controls.',
  'settings.recentBackups': 'Recent Backups',
  'settings.recentBackupsDesc': 'Restore your data from previous backup points.',
  'settings.cloudArchive': 'Cloud Archive',
  'settings.cloudArchiveDesc': 'Store and sync your data securely in the cloud.',
  'settings.recycleBin': 'Recycle Bin',
  'settings.recycleBinDesc': 'Check the recycle bin to recover deleted content.',
  'settings.language': 'Language',
  'settings.languageDesc': 'Choose the language for the entire app interface.',
  'settings.deleteAll': 'Delete All Data',
  'settings.deleteAllDesc': 'Permanently delete and reset all notes, settings and files in the app.',
  'settings.deleteStep1Title': 'Delete Data (Step 1/2)',
  'settings.deleteStep1Message': 'Are you sure you want to delete all app data? This cannot be recovered.',
  'settings.deleteNext': 'Next Step',
  'settings.deleteFinalTitle': 'Final Confirmation (Step 2/2)',
  'settings.deleteFinalMessage': 'Local storage, database and settings will all be permanently deleted. Are you ready?',
  'settings.deleteConfirm': 'Delete Everything',
  'settings.deleteGoBack': 'No, Go Back',

  // AI / Agent
  'ai.title': 'Agent',
  'ai.addModel': 'Add Model',
  'ai.selectModel': 'Select Model',
  'ai.noModelsConfigured': 'No models configured',
  'ai.settings': 'Settings',
  'ai.clearChat': 'Clear Chat',
  'ai.backToNotes': 'Back to notes',
  'ai.welcomeTitle': 'AI Assistant',
  'ai.welcomeDesc': 'How can AI help you analyze notes, organize tasks, or brainstorm ideas today?',
  'ai.placeholder': 'How can I help you?',
  'ai.messageLabel': 'Message AI',

  // Vault
  'vault.title': 'Security Vault',
  'vault.subtitle': 'Your locked notes, protected in one place',
  'vault.secureEnvironment': 'Secure Environment',
  'vault.setupTitle': 'Set Up Your Vault',
  'vault.unlockTitle': 'Unlock Vault',
  'vault.setupSubtitle': 'Create a master password to protect your locked notes',
  'vault.unlockSubtitle': 'Enter your master password to view locked notes',
  'vault.masterPassword': 'Master Password',
  'vault.confirmPassword': 'Confirm Password',
  'vault.passwordPlaceholder': 'Enter at least 8 characters',
  'vault.confirmPlaceholder': 'Repeat the password',
  'vault.unlock': 'Unlock Vault',
  'vault.setupCta': 'Set Password & Open Vault',
  'vault.lockNow': 'Lock Vault',
  'vault.searchPlaceholder': 'Search inside the vault…',
  'vault.totalLocked': 'Locked Notes',
  'vault.protection': 'Protection',
  'vault.protectionOn': 'Password On',
  'vault.storage': 'Storage',
  'vault.storageLocal': 'Local Only',
  'vault.encryptedBadge': 'Encrypted',
  'vault.pinProtected': 'PIN / Password Protected',
  'vault.openFromVault': 'Open',
  'vault.unlockNote': 'Unlock Note',
  'vault.emptyTitle': 'Vault is Empty',
  'vault.emptyDesc': 'No protected notes found. Lock a note and it will appear here.',
  'vault.noResults': 'No notes match your search.',
  'vault.encryptionNote': 'Note text is encrypted. Titles and attachments are not.',
  'vault.footerNote': 'End-to-End Encryption Enabled',
  'vault.errorMinLength': 'Password must be at least 8 characters',
  'vault.errorMismatch': 'The two passwords do not match',
  'vault.errorWrong': 'Wrong password, please try again',
  'vault.errorWrongNote': 'Wrong note password',
  'vault.confirmRemove': 'Remove protection from this note?',
  'vault.notePasswordPrompt': "Enter this note's password:",
  'vault.showPassword': 'Show password',
  'vault.hidePassword': 'Hide password',
  'vault.strengthWeak': 'Weak',
  'vault.strengthFair': 'Fair',
  'vault.strengthGood': 'Good',
  'vault.strengthStrong': 'Strong',
  'vault.strengthLabel': 'Password strength',
  'vault.lastUpdated': 'Updated {date}',
} as const;

export type TranslationKey = keyof typeof en;

const bn: Record<TranslationKey, string> = {
  // Navigation / Sidebar
  'nav.agent': 'Agent',
  'nav.bookmarks': 'বুকমার্কসমূহ',
  'nav.vault': 'সিকিউরিটি ভল্ট',
  'nav.tools': 'টুলস সেকশন',
  'nav.settings': 'সেটিংস',
  'nav.recycleBin': 'রিসাইকেল বিন',
  'nav.notes': 'নোটস',
  'nav.search': 'সার্চ',
  'nav.appMenu': 'অ্যাপ মেনু',
  'nav.recentNotes': 'সাম্প্রতিক ৩টি নোট',
  'nav.favorites': '★ পছন্দের নোটসমূহ',
  'nav.noNotes': 'কোনো নোট পাওয়া যায়নি',
  'nav.untitled': 'শিরোনামহীন',
  'nav.newPage': 'নতুন পেজ',
  'nav.tapToSwitchWorkspace': 'ট্যাপ করে ওয়ার্কস্পেস বদলান',
  'nav.close': 'বন্ধ করুন',

  // Common
  'common.back': 'ফিরে যান',
  'common.cancel': 'বাতিল',

  // Home
  'home.pages': 'পেজসমূহ ({count})',
  'home.grid': 'Grid',
  'home.layer': 'Layer',
  'home.gridMode': 'Grid Mode (2-কলাম গ্রিড)',
  'home.layerMode': 'Layer Mode (এক কলাম লিস্ট)',
  'home.noNotes': 'কোনো নোট পাওয়া যায়নি',
  'home.loadingMore': 'আরও নোট লোড হচ্ছে…',

  // Settings
  'settings.title': 'সেটিংস',
  'settings.subtitle': 'App Settings',
  'settings.aiSection': 'এআই এবং ইন্টেলিজেন্স',
  'settings.dataSection': 'ডেটা এবং স্টোরেজ',
  'settings.preferencesSection': 'পছন্দসমূহ',
  'settings.dangerZone': 'বিপজ্জনক এলাকা (Danger Zone)',
  'settings.aiConfig': 'এআই কনফিগারেশন',
  'settings.aiConfigDesc': 'এপিআই কী এবং মডেল কন্ট্রোল সেটআপ করুন।',
  'settings.dataMonitor': 'ডেটা মনিটর',
  'settings.dataMonitorDesc': 'স্টোরেজ ব্যবহার এবং ব্যাকআপ কন্ট্রোল চেক করুন।',
  'settings.recentBackups': 'রিসেন্ট ব্যাকআপ',
  'settings.recentBackupsDesc': 'আগের ব্যাকআপ পয়েন্টগুলো থেকে আপনার ডেটা রিস্টোর করুন।',
  'settings.cloudArchive': 'ক্লাউড আর্কাইভ',
  'settings.cloudArchiveDesc': 'আপনার ডেটা ক্লাউডে সুরক্ষিতভাবে সংরক্ষণ ও সিঙ্ক করুন।',
  'settings.recycleBin': 'রিসাইকেল বিন',
  'settings.recycleBinDesc': 'মুছে ফেলা কন্টেন্ট পুনরুদ্ধার করতে রিসাইকেল বিন চেক করুন।',
  'settings.language': 'Language',
  'settings.languageDesc': 'সম্পূর্ণ অ্যাপ ইন্টারফেসের ভাষা বেছে নিন।',
  'settings.deleteAll': 'সমস্ত ডেটা মুছুন',
  'settings.deleteAllDesc': 'অ্যাপের সমস্ত নোট, সেটিংস এবং ফাইল চিরতরে মুছে ফেলুন এবং রিসেট করুন।',
  'settings.deleteStep1Title': 'ডেটা মুছুন (Step 1/2)',
  'settings.deleteStep1Message': 'আপনি কি নিশ্চিত যে আপনি সমস্ত অ্যাপ ডেটা মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা সম্ভব হবে না।',
  'settings.deleteNext': 'পরবর্তী ধাপ',
  'settings.deleteFinalTitle': 'চূড়ান্ত নিশ্চিতকরণ (Step 2/2)',
  'settings.deleteFinalMessage': 'লোকাল স্টোরেজ, ডাটাবেজ এবং সেটিংস সবকিছু চিরতরে মুছে যাবে। আপনি কি প্রস্তুত?',
  'settings.deleteConfirm': 'সব মুছুন',
  'settings.deleteGoBack': 'না, ফিরে যান',

  // AI / Agent
  'ai.title': 'Agent',
  'ai.addModel': 'Add Model',
  'ai.selectModel': 'মডেল বেছে নিন',
  'ai.noModelsConfigured': 'কোনো মডেল কনফিগার করা নেই',
  'ai.settings': 'Settings',
  'ai.clearChat': 'Clear Chat',
  'ai.backToNotes': 'নোটে ফিরে যান',
  'ai.welcomeTitle': 'AI Assistant',
  'ai.welcomeDesc': 'আজ নোট বিশ্লেষণ, কাজ সাজানো বা নতুন আইডিয়া ভাবতে AI কীভাবে সাহায্য করতে পারে?',
  'ai.placeholder': 'কীভাবে সাহায্য করতে পারি?',
  'ai.messageLabel': 'AI-কে মেসেজ করুন',

  // Vault
  'vault.title': 'সিকিউরিটি ভল্ট',
  'vault.subtitle': 'আপনার লক করা নোট, এক জায়গায় সুরক্ষিত',
  'vault.secureEnvironment': 'Secure Environment',
  'vault.setupTitle': 'আপনার ভল্ট সেট আপ করুন',
  'vault.unlockTitle': 'ভল্ট আনলক করুন',
  'vault.setupSubtitle': 'লক করা নোট সুরক্ষিত রাখতে একটি মাস্টার পাসওয়ার্ড তৈরি করুন',
  'vault.unlockSubtitle': 'লক করা নোট দেখতে মাস্টার পাসওয়ার্ড দিন',
  'vault.masterPassword': 'মাস্টার পাসওয়ার্ড',
  'vault.confirmPassword': 'পাসওয়ার্ড নিশ্চিত করুন',
  'vault.passwordPlaceholder': 'কমপক্ষে ৮ অক্ষর দিন',
  'vault.confirmPlaceholder': 'পাসওয়ার্ডটি আবার লিখুন',
  'vault.unlock': 'ভল্ট আনলক করুন',
  'vault.setupCta': 'পাসওয়ার্ড সেট করে ভল্ট খুলুন',
  'vault.lockNow': 'ভল্ট লক করুন',
  'vault.searchPlaceholder': 'ভল্টে কন্টেন্ট খুঁজুন...',
  'vault.totalLocked': 'লক করা নোট',
  'vault.protection': 'সুরক্ষা',
  'vault.protectionOn': 'পাসওয়ার্ড চালু',
  'vault.storage': 'স্টোরেজ',
  'vault.storageLocal': 'শুধু লোকাল',
  'vault.encryptedBadge': 'এনক্রিপ্টেড',
  'vault.pinProtected': 'PIN / পাসওয়ার্ড সুরক্ষিত',
  'vault.openFromVault': 'খুলুন',
  'vault.unlockNote': 'আনলক',
  'vault.emptyTitle': 'Vault is Empty',
  'vault.emptyDesc': 'সুরক্ষিত কোনো ডেটা পাওয়া যায়নি। কোনো নোট লক করলে তা এখানে দেখা যাবে।',
  'vault.noResults': 'আপনার সার্চের সাথে কোনো নোট মেলেনি।',
  'vault.encryptionNote': 'নোটের লেখা এনক্রিপ্টেড; শিরোনাম ও সংযুক্ত ফাইল নয়।',
  'vault.footerNote': 'End-to-End Encryption Enabled',
  'vault.errorMinLength': 'পাসওয়ার্ড অন্তত ৮ অক্ষরের হতে হবে',
  'vault.errorMismatch': 'পাসওয়ার্ড দুটি মিলেনি',
  'vault.errorWrong': 'ভুল পাসওয়ার্ড, আবার চেষ্টা করুন',
  'vault.errorWrongNote': 'ভুল নোট পাসওয়ার্ড',
  'vault.confirmRemove': 'আপনি কি এই নোটটির সুরক্ষা সরিয়ে ফেলতে চান?',
  'vault.notePasswordPrompt': 'এই নোটের পাসওয়ার্ড দিন:',
  'vault.showPassword': 'পাসওয়ার্ড দেখুন',
  'vault.hidePassword': 'পাসওয়ার্ড লুকান',
  'vault.strengthWeak': 'দুর্বল',
  'vault.strengthFair': 'মোটামুটি',
  'vault.strengthGood': 'ভালো',
  'vault.strengthStrong': 'শক্তিশালী',
  'vault.strengthLabel': 'পাসওয়ার্ডের শক্তি',
  'vault.lastUpdated': 'আপডেট: {date}',
};

export const translations: Record<AppLanguage, Record<TranslationKey, string>> = { en, bn };

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'bn';
}

/** Synchronous read — safe to call during first render. */
export function getStoredLanguage(): AppLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(stored)) return stored;
  } catch {
    /* storage unavailable (private mode etc.) — fall through to default */
  }
  return DEFAULT_LANGUAGE;
}

function applyDocumentLang(language: AppLanguage) {
  try {
    document.documentElement.lang = language === 'bn' ? 'bn' : 'en';
  } catch {
    /* non-DOM environment */
  }
}

/** Persist + broadcast. Every `useLanguage()` consumer re-renders. */
export function setStoredLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* ignore — the in-memory event below still updates the UI */
  }
  applyDocumentLang(language);
  window.dispatchEvent(new CustomEvent<AppLanguage>(LANGUAGE_CHANGED_EVENT, { detail: language }));
}

/** Translate one key, with optional `{name}` placeholder interpolation. */
export function translate(
  language: AppLanguage,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  let text = translations[language][key] ?? translations.en[key] ?? key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

/** Convenience bound translator for non-React code. */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  return translate(getStoredLanguage(), key, params);
}

/**
 * React hook: returns the active language, a setter that persists it
 * (localStorage + broadcast), and a bound `t()` for rendering.
 */
export function useLanguage() {
  const [language, setLanguageState] = useState<AppLanguage>(() => getStoredLanguage());

  useEffect(() => {
    applyDocumentLang(language);
  }, [language]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const next = (event as CustomEvent<AppLanguage>).detail;
      setLanguageState(isAppLanguage(next) ? next : getStoredLanguage());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY) setLanguageState(getStoredLanguage());
    };
    window.addEventListener(LANGUAGE_CHANGED_EVENT, onChanged);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, onChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    setStoredLanguage(next);
  }, []);

  const boundT = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => translate(language, key, params),
    [language],
  );

  return { language, setLanguage, t: boundT };
}
