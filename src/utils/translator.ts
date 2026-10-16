/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
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
/**
 * No AI model is pre-configured. The Agent surface must show
 * "No model configured" until the user adds a model themselves.
 */

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
  'settings.overview': 'Overview',
  'settings.storageUsed': 'Storage Used',
  'settings.storageOf': '{used} of {quota}',
  'settings.workspaces': 'Workspaces',
  'settings.localNote': 'All your data stays locally on this device',

  // AI / Agent
  'ai.title': 'Agent',
  'ai.addModel': 'Add Model',
  'ai.selectModel': 'Select Model',
  'ai.noModelsConfigured': 'No model configured',
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

  // Tools
  'tools.eyebrow': 'Creative Suite',
  'tools.title': 'Tools',
  'tools.subtitle': 'Powerful utilities to structure, generate and reuse your knowledge.',
  'tools.architect': 'AI Content Architect',
  'tools.architectDesc': 'Turn raw ideas into deeply structured, multi-page content with AI-generated JSON architecture.',
  'tools.templates': 'Templates',
  'tools.templatesDesc': 'Start faster with ready-made page layouts for work, life and personal projects.',
  'tools.open': 'Open Tool',
  'tools.badgeAi': 'AI Powered',
  'tools.badgeLibrary': 'Library',
  'tools.comingSoon': 'More tools coming soon',
  'tools.comingSoonDesc': 'New utilities are being crafted. Stay tuned.',
  'tools.backToMain': 'Back to main',

  // Templates
  'templates.eyebrow': 'Template Library',
  'templates.title': 'Templates',
  'templates.subtitle': 'Pick a template and a new page is created instantly in your workspace.',
  'templates.all': 'All',
  'templates.live': 'Live',
  'templates.work': 'Work',
  'templates.personal': 'Personal',
  'templates.use': 'Use Template',
  'templates.empty': 'No templates in this category yet.',
  'templates.count': '{count} templates',

  // Workspace
  'workspace.eyebrow': 'Workspace Manager',
  'workspace.title': 'Workspaces',
  'workspace.subtitle': 'Organize projects into separate workspaces — each holds up to 10,000 notes.',
  'workspace.createNew': 'New Workspace',
  'workspace.searchPlaceholder': 'Search workspaces…',
  'workspace.nameLabel': 'Workspace name',
  'workspace.namePlaceholder': 'e.g. Personal Projects',
  'workspace.colorLabel': 'Theme color',
  'workspace.create': 'Create Workspace',
  'workspace.active': 'Active',
  'workspace.current': 'Current Workspace',
  'workspace.switch': 'Switch',
  'workspace.logo': 'Logo',
  'workspace.menu': 'Workspace menu',
  'workspace.notesCount': 'Notes',
  'workspace.settingsTitle': 'Workspace Settings',
  'workspace.rename': 'Rename',
  'workspace.renameDesc': 'Edit the workspace title',
  'workspace.appearance': 'Icon & Theme Color',
  'workspace.appearanceDesc': 'Customize logo, preset icons, emoji and color',
  'workspace.duplicate': 'Duplicate Workspace',
  'workspace.duplicateDesc': 'Clone this workspace and all of its notes',
  'workspace.exportBackup': 'Export Backup (JSON)',
  'workspace.exportDesc': 'Download every note in this workspace',
  'workspace.clearNotes': 'Clear All Notes',
  'workspace.clearNotesDesc': 'Keep the workspace, empty its notes',
  'workspace.deleteWorkspace': 'Delete Workspace',
  'workspace.deleteDesc': 'Permanently remove this workspace',
  'workspace.deleteTitle': 'Delete Workspace',
  'workspace.deleteMessage': 'Are you sure you want to permanently delete this workspace and every note inside it? This cannot be undone.',
  'workspace.clearTitle': 'Clear All Notes',
  'workspace.clearMessage': 'Delete every note in this workspace? The workspace itself will stay.',
  'workspace.confirmDelete': 'Yes, Delete',
  'workspace.confirmClear': 'Clear Notes',
  'workspace.limitTitle': 'Workspace Quota',
  'workspace.limitHeading': '10,000 notes per workspace',
  'workspace.limitBody': 'To keep your browser fast and smooth, each workspace holds up to 10,000 notes. You can create as many workspaces as you like.',
  'workspace.understood': 'Got it',
  'workspace.noResults': 'No workspace found',
  'workspace.noResultsDesc': 'Try a different search, or create a new workspace.',

  // AI Content Architect
  'architect.eyebrow': 'System Architect',
  'architect.title': 'Content Architect',
  'architect.subtitle': 'Generate structured JSON with AI, preview it, then build real pages instantly.',
  'architect.step1': 'Step 1 · Get Prompt',
  'architect.step1Desc': 'Use this prompt with your favorite AI model to generate structured JSON content.',
  'architect.copyPrompt': 'Copy System Prompt',
  'architect.copyContextPrompt': 'Copy Contextual Prompt',
  'architect.copied': 'Copied',
  'architect.step2': 'Step 2 · Choose Target',
  'architect.searchPages': 'Search pages…',
  'architect.newPage': 'New Independent Page',
  'architect.makeSubpage': 'Make sub-page of this',
  'architect.changePlaceholder': 'What changes do you want?',
  'architect.step3': 'Step 3 · Import JSON',
  'architect.valid': 'Structure Valid',
  'architect.invalid': 'Parsing Error',
  'architect.waiting': 'Waiting…',
  'architect.pastePlaceholder': 'Paste the JSON array here…',
  'architect.preview': 'Architectural Preview',
  'architect.importUpdate': 'Update Existing Page',
  'architect.importSubpages': 'Build as Sub-pages',
  'architect.importNew': 'Build Content',
  'architect.success': 'Content built successfully!',
  'architect.failed': 'Building failed. Please try again.',
  'architect.untitled': 'Untitled',

  // Editor header / sub-pages
  'editor.subpages': 'Sub-pages',
  'editor.addSubpage': 'Add Sub-page',
  'editor.attachSubpage': 'Attach Existing',
  'editor.noSubpages': 'No sub-pages yet',
  'editor.theme': 'Theme',
  'editor.tags': 'Tags',
  'editor.export': 'Export',
  'editor.delete': 'Delete',
  'editor.searchPlaceholder': 'Search in page…',
  'editor.saveFailed': 'Save failed',
  'editor.saving': 'Saving…',

  // Block picker
  'blocks.title': 'Add a Block',
  'blocks.searchPlaceholder': 'Search blocks…',
  'blocks.basic': 'Basic Blocks',
  'blocks.lists': 'Lists',
  'blocks.media': 'Media & Advanced',
  'blocks.empty': 'No blocks match your search.',
  'blocks.cancel': 'Cancel',

  // Formatting toolbar
  'format.textColor': 'Text Color',
  'format.highlight': 'Highlight',
  'format.highlightOff': 'No Highlight',
  'format.defaultColor': 'Default',
  'format.linkPlaceholder': 'Paste a link…',

  // Search filters
  'search.filters': 'Filters',
  'search.clear': 'Clear',
  'search.apply': 'Apply',

  // AI Configuration
  'aiConfig.tagline': 'Model & API Control Center',
  'aiConfig.selectCore': 'Choose AI Provider',
  'aiConfig.accessKey': 'Access Secret Key',
  'aiConfig.configuredModels': 'Your Models',
  'aiConfig.addModelPlaceholder': 'Type a model name to add…',
  'aiConfig.add': 'Add',
  'aiConfig.noModels': 'No model added yet',
  'aiConfig.noModelsDesc': 'Type a model name below to add your first model.',
  'aiConfig.activeModel': 'Active',
  'aiConfig.systemPrompt': 'System Prompt',
  'aiConfig.builtIn': 'Built-in & Optimized',
  'aiConfig.unsaved': 'Unsaved changes',
  'aiConfig.reset': 'Reset',
  'aiConfig.configuration': 'Configuration',
  'aiConfig.statsProvider': 'Provider',
  'aiConfig.statsModels': 'Models',
  'aiConfig.statsKey': 'API Key',
  'aiConfig.keySet': 'Set',
  'aiConfig.keyMissing': 'Not set',
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
  'home.grid': 'গ্রিড',
  'home.layer': 'লেয়ার',
  'home.gridMode': 'গ্রিড মোড (২ কলাম)',
  'home.layerMode': 'লেয়ার মোড (এক কলাম লিস্ট)',
  'home.noNotes': 'কোনো নোট পাওয়া যায়নি',
  'home.loadingMore': 'আরও নোট লোড হচ্ছে…',

  // Settings
  'settings.title': 'সেটিংস',
  'settings.subtitle': 'অ্যাপ সেটিংস',
  'settings.aiSection': 'এআই এবং ইন্টেলিজেন্স',
  'settings.dataSection': 'ডেটা এবং স্টোরেজ',
  'settings.preferencesSection': 'পছন্দসমূহ',
  'settings.dangerZone': 'বিপজ্জনক এলাকা',
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
  'settings.language': 'ভাষা',
  'settings.languageDesc': 'সম্পূর্ণ অ্যাপ ইন্টারফেসের ভাষা বেছে নিন।',
  'settings.deleteAll': 'সমস্ত ডেটা মুছুন',
  'settings.deleteAllDesc': 'অ্যাপের সমস্ত নোট, সেটিংস এবং ফাইল চিরতরে মুছে ফেলুন এবং রিসেট করুন।',
  'settings.deleteStep1Title': 'ডেটা মুছুন (ধাপ ১/২)',
  'settings.deleteStep1Message': 'আপনি কি নিশ্চিত যে আপনি সমস্ত অ্যাপ ডেটা মুছে ফেলতে চান? এটি আর পুনরুদ্ধার করা সম্ভব হবে না।',
  'settings.deleteNext': 'পরবর্তী ধাপ',
  'settings.deleteFinalTitle': 'চূড়ান্ত নিশ্চিতকরণ (ধাপ ২/২)',
  'settings.deleteFinalMessage': 'লোকাল স্টোরেজ, ডাটাবেজ এবং সেটিংস সবকিছু চিরতরে মুছে যাবে। আপনি কি প্রস্তুত?',
  'settings.deleteConfirm': 'সব মুছুন',
  'settings.deleteGoBack': 'না, ফিরে যান',
  'settings.overview': 'ওভারভিউ',
  'settings.storageUsed': 'ব্যবহৃত স্টোরেজ',
  'settings.storageOf': '{quota} এর মধ্যে {used}',
  'settings.workspaces': 'ওয়ার্কস্পেসসমূহ',
  'settings.localNote': 'আপনার সব ডেটা এই ডিভাইসেই লোকালভাবে থাকে',

  // AI / Agent
  'ai.title': 'Agent',
  'ai.addModel': 'Add Model',
  'ai.selectModel': 'মডেল বেছে নিন',
  'ai.noModelsConfigured': 'কোনো মডেল কনফিগার করা নেই',
  'ai.settings': 'সেটিংস',
  'ai.clearChat': 'চ্যাট মুছুন',
  'ai.backToNotes': 'নোটে ফিরে যান',
  'ai.welcomeTitle': 'AI সহকারী',
  'ai.welcomeDesc': 'আজ নোট বিশ্লেষণ, কাজ সাজানো বা নতুন আইডিয়া ভাবতে AI কীভাবে সাহায্য করতে পারে?',
  'ai.placeholder': 'কীভাবে সাহায্য করতে পারি?',
  'ai.messageLabel': 'AI-কে মেসেজ করুন',

  // Vault
  'vault.title': 'সিকিউরিটি ভল্ট',
  'vault.subtitle': 'আপনার লক করা নোট, এক জায়গায় সুরক্ষিত',
  'vault.secureEnvironment': 'নিরাপদ পরিবেশ',
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
  'vault.emptyTitle': 'ভল্ট খালি',
  'vault.emptyDesc': 'সুরক্ষিত কোনো ডেটা পাওয়া যায়নি। কোনো নোট লক করলে তা এখানে দেখা যাবে।',
  'vault.noResults': 'আপনার সার্চের সাথে কোনো নোট মেলেনি।',
  'vault.encryptionNote': 'নোটের লেখা এনক্রিপ্টেড; শিরোনাম ও সংযুক্ত ফাইল নয়।',
  'vault.footerNote': 'এন্ড-টু-এন্ড এনক্রিপশন সক্রিয়',
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

  // Tools
  'tools.eyebrow': 'ক্রিয়েটিভ স্যুট',
  'tools.title': 'টুলস',
  'tools.subtitle': 'আপনার জ্ঞান সাজাতে, তৈরি করতে ও আবার ব্যবহার করতে শক্তিশালী সব ইউটিলিটি।',
  'tools.architect': 'AI কন্টেন্ট আর্কিটেক্ট',
  'tools.architectDesc': 'AI-তৈরি JSON আর্কিটেকচার দিয়ে কাঁচা আইডিয়াকে গভীরভাবে সাজানো মাল্টি-পেজ কন্টেন্টে রূপ দিন।',
  'tools.templates': 'টেমপ্লেটসমূহ',
  'tools.templatesDesc': 'কাজ, জীবন ও ব্যক্তিগত প্রজেক্টের জন্য তৈরি পেজ লেআউট দিয়ে দ্রুত শুরু করুন।',
  'tools.open': 'টুল খুলুন',
  'tools.badgeAi': 'AI চালিত',
  'tools.badgeLibrary': 'লাইব্রেরি',
  'tools.comingSoon': 'আরও টুল আসছে শীঘ্রই',
  'tools.comingSoonDesc': 'নতুন নতুন ইউটিলিটি তৈরি হচ্ছে। সাথে থাকুন।',
  'tools.backToMain': 'মূল পেজে ফিরুন',

  // Templates
  'templates.eyebrow': 'টেমপ্লেট লাইব্রেরি',
  'templates.title': 'টেমপ্লেটসমূহ',
  'templates.subtitle': 'একটি টেমপ্লেট বেছে নিন — সাথে সাথে আপনার ওয়ার্কস্পেসে নতুন পেজ তৈরি হয়ে যাবে।',
  'templates.all': 'সব',
  'templates.live': 'লাইভ',
  'templates.work': 'কাজ',
  'templates.personal': 'ব্যক্তিগত',
  'templates.use': 'টেমপ্লেট ব্যবহার করুন',
  'templates.empty': 'এই ক্যাটাগরিতে এখনো কোনো টেমপ্লেট নেই।',
  'templates.count': '{count}টি টেমপ্লেট',

  // Workspace
  'workspace.eyebrow': 'ওয়ার্কস্পেস ম্যানেজার',
  'workspace.title': 'ওয়ার্কস্পেসসমূহ',
  'workspace.subtitle': 'প্রজেক্ট অনুযায়ী আলাদা ওয়ার্কস্পেসে সাজান — প্রতিটিতে সর্বোচ্চ ১০,০০০ নোট।',
  'workspace.createNew': 'নতুন ওয়ার্কস্পেস',
  'workspace.searchPlaceholder': 'ওয়ার্কস্পেস খুঁজুন…',
  'workspace.nameLabel': 'ওয়ার্কস্পেসের নাম',
  'workspace.namePlaceholder': 'যেমন: ব্যক্তিগত প্রজেক্ট',
  'workspace.colorLabel': 'থিমের রং',
  'workspace.create': 'ওয়ার্কস্পেস তৈরি করুন',
  'workspace.active': 'সক্রিয়',
  'workspace.current': 'বর্তমান ওয়ার্কস্পেস',
  'workspace.switch': 'সুইচ করুন',
  'workspace.logo': 'লোগো',
  'workspace.menu': 'ওয়ার্কস্পেস মেনু',
  'workspace.notesCount': 'নোট সংখ্যা',
  'workspace.settingsTitle': 'ওয়ার্কস্পেস সেটিংস',
  'workspace.rename': 'নাম পরিবর্তন করুন',
  'workspace.renameDesc': 'ওয়ার্কস্পেসের শিরোনাম সম্পাদনা করুন',
  'workspace.appearance': 'আইকন ও থিম কালার',
  'workspace.appearanceDesc': 'লোগো, প্রিসেট আইকন, ইমোজি ও কালার কাস্টমাইজ করুন',
  'workspace.duplicate': 'ডুপ্লিকেট করুন',
  'workspace.duplicateDesc': 'এই ওয়ার্কস্পেস ও এর সব নোট ক্লোন করুন',
  'workspace.exportBackup': 'ব্যাকআপ এক্সপোর্ট (JSON)',
  'workspace.exportDesc': 'এই ওয়ার্কস্পেসের সব নোট ডাউনলোড করুন',
  'workspace.clearNotes': 'সব নোট মুছে ফেলুন',
  'workspace.clearNotesDesc': 'ওয়ার্কস্পেস অক্ষত রেখে নোটগুলো খালি করুন',
  'workspace.deleteWorkspace': 'ওয়ার্কস্পেস ডিলিট করুন',
  'workspace.deleteDesc': 'স্থায়ীভাবে এই ওয়ার্কস্পেস মুছে ফেলুন',
  'workspace.deleteTitle': 'ওয়ার্কস্পেস মুছে ফেলুন',
  'workspace.deleteMessage': 'আপনি কি নিশ্চিত যে এই ওয়ার্কস্পেস এবং এর ভেতরের সমস্ত নোট চিরতরে ডিলিট করতে চান? এটি আর ফেরত আনা যাবে না।',
  'workspace.clearTitle': 'সব নোট ক্লিয়ার করুন',
  'workspace.clearMessage': 'এই ওয়ার্কস্পেসের সব নোট মুছে ফেলতে চান? ওয়ার্কস্পেসটি অক্ষত থাকবে।',
  'workspace.confirmDelete': 'হ্যাঁ, ডিলিট করুন',
  'workspace.confirmClear': 'সব নোট মুছুন',
  'workspace.limitTitle': 'ওয়ার্কস্পেস কোটা ও তথ্য',
  'workspace.limitHeading': 'প্রতি ওয়ার্কস্পেসে ১০,০০০ নোটের লিমিট',
  'workspace.limitBody': 'ব্রাউজার ও ডিভাইসের পারফরম্যান্স দ্রুত ও মসৃণ রাখতে প্রতিটি ওয়ার্কস্পেসে সর্বোচ্চ ১০,০০০ নোট রাখা যায়। আপনি যত ইচ্ছা নতুন ওয়ার্কস্পেস তৈরি করতে পারেন।',
  'workspace.understood': 'বুঝেছি',
  'workspace.noResults': 'কোনো ওয়ার্কস্পেস পাওয়া যায়নি',
  'workspace.noResultsDesc': 'অন্য কিছু খুঁজে দেখুন, অথবা নতুন ওয়ার্কস্পেস তৈরি করুন।',

  // AI Content Architect
  'architect.eyebrow': 'সিস্টেম আর্কিটেক্ট',
  'architect.title': 'কন্টেন্ট আর্কিটেক্ট',
  'architect.subtitle': 'AI দিয়ে সাজানো JSON তৈরি করুন, প্রিভিউ দেখুন, তারপর সাথে সাথে আসল পেজ বানান।',
  'architect.step1': 'ধাপ ১ · প্রম্পট নিন',
  'architect.step1Desc': 'আপনার পছন্দের AI মডেলে এই প্রম্পট ব্যবহার করে সাজানো JSON কন্টেন্ট তৈরি করুন।',
  'architect.copyPrompt': 'সিস্টেম প্রম্পট কপি করুন',
  'architect.copyContextPrompt': 'কনটেক্সটসহ প্রম্পট কপি করুন',
  'architect.copied': 'কপি হয়েছে',
  'architect.step2': 'ধাপ ২ · টার্গেট বেছে নিন',
  'architect.searchPages': 'পেজ খুঁজুন…',
  'architect.newPage': 'নতুন স্বতন্ত্র পেজ',
  'architect.makeSubpage': 'এটির সাব-পেজ বানান',
  'architect.changePlaceholder': 'কী কী পরিবর্তন চান?',
  'architect.step3': 'ধাপ ৩ · JSON ইম্পোর্ট',
  'architect.valid': 'স্ট্রাকচার সঠিক',
  'architect.invalid': 'পার্সিং এরর',
  'architect.waiting': 'অপেক্ষমাণ…',
  'architect.pastePlaceholder': 'JSON অ্যারেটি এখানে পেস্ট করুন…',
  'architect.preview': 'আর্কিটেকচারাল প্রিভিউ',
  'architect.importUpdate': 'বিদ্যমান পেজ আপডেট করুন',
  'architect.importSubpages': 'সাব-পেজ হিসেবে বানান',
  'architect.importNew': 'কন্টেন্ট বানান',
  'architect.success': 'কন্টেন্ট সফলভাবে তৈরি হয়েছে!',
  'architect.failed': 'তৈরি ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
  'architect.untitled': 'শিরোনামহীন',

  // Editor header / sub-pages
  'editor.subpages': 'সাব-পেজসমূহ',
  'editor.addSubpage': 'সাব-পেজ যোগ করুন',
  'editor.attachSubpage': 'বিদ্যমান যোগ করুন',
  'editor.noSubpages': 'এখনো কোনো সাব-পেজ নেই',
  'editor.theme': 'থিম',
  'editor.tags': 'ট্যাগ',
  'editor.export': 'এক্সপোর্ট',
  'editor.delete': 'মুছুন',
  'editor.searchPlaceholder': 'পেজে খুঁজুন…',
  'editor.saveFailed': 'সংরক্ষণ ব্যর্থ',
  'editor.saving': 'সংরক্ষণ হচ্ছে…',

  // Block picker
  'blocks.title': 'ব্লক যোগ করুন',
  'blocks.searchPlaceholder': 'ব্লক খুঁজুন…',
  'blocks.basic': 'বেসিক ব্লক',
  'blocks.lists': 'লিস্টসমূহ',
  'blocks.media': 'মিডিয়া ও অ্যাডভান্সড',
  'blocks.empty': 'আপনার খোঁজের সাথে কোনো ব্লক মেলেনি।',
  'blocks.cancel': 'বাতিল',

  // Formatting toolbar
  'format.textColor': 'লেখার রং',
  'format.highlight': 'হাইলাইট',
  'format.highlightOff': 'হাইলাইট নেই',
  'format.defaultColor': 'ডিফল্ট',
  'format.linkPlaceholder': 'লিংক পেস্ট করুন…',

  // Search filters
  'search.filters': 'ফিল্টারসমূহ',
  'search.clear': 'মুছুন',
  'search.apply': 'প্রয়োগ করুন',

  // AI Configuration
  'aiConfig.tagline': 'মডেল ও API কন্ট্রোল সেন্টার',
  'aiConfig.selectCore': 'AI প্রোভাইডার বেছে নিন',
  'aiConfig.accessKey': 'অ্যাক্সেস সিক্রেট কী',
  'aiConfig.configuredModels': 'আপনার মডেলসমূহ',
  'aiConfig.addModelPlaceholder': 'যোগ করতে মডেলের নাম লিখুন…',
  'aiConfig.add': 'যোগ করুন',
  'aiConfig.noModels': 'এখনো কোনো মডেল যোগ করা হয়নি',
  'aiConfig.noModelsDesc': 'নিচে মডেলের নাম লিখে আপনার প্রথম মডেলটি যোগ করুন।',
  'aiConfig.activeModel': 'সক্রিয়',
  'aiConfig.systemPrompt': 'সিস্টেম প্রম্পট',
  'aiConfig.builtIn': 'বিল্ট-ইন ও অপ্টিমাইজড',
  'aiConfig.unsaved': 'অসংরক্ষিত পরিবর্তন',
  'aiConfig.reset': 'রিসেট',
  'aiConfig.configuration': 'কনফিগারেশন',
  'aiConfig.statsProvider': 'প্রোভাইডার',
  'aiConfig.statsModels': 'মডেল',
  'aiConfig.statsKey': 'API কী',
  'aiConfig.keySet': 'সেট আছে',
  'aiConfig.keyMissing': 'সেট নেই',
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
