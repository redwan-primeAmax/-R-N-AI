/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sparkles, Bookmark, Lock, Wrench, Settings, Trash2, FileText, Search } from 'lucide-react';
import type { TranslationKey } from '../utils/translator';

export const MAIN_NAV_ITEMS = [
  { icon: FileText, labelKey: 'nav.notes' as TranslationKey, label: 'নোটস', path: '/main' },
  { icon: Search, labelKey: 'nav.search' as TranslationKey, label: 'সার্চ', path: '/search' },
] as const;

export const SIDEBAR_MENU_ITEMS = [
  { icon: Sparkles, labelKey: 'nav.agent' as TranslationKey, label: 'Agent', path: '/ai-chat' },
  { icon: Bookmark, labelKey: 'nav.bookmarks' as TranslationKey, label: 'বুকমার্কসমূহ', path: '/bookmarks' },
  { icon: Lock, labelKey: 'nav.vault' as TranslationKey, label: 'সিকিউর ভল্ট (লকড)', path: '/vault' },
  { icon: Wrench, labelKey: 'nav.tools' as TranslationKey, label: 'টুলস সেকশন', path: '/tools' },
  { icon: Settings, labelKey: 'nav.settings' as TranslationKey, label: 'Settings', path: '/settings' },
  { icon: Trash2, labelKey: 'nav.recycleBin' as TranslationKey, label: 'রিসাইকেল বিন', path: '/recycle-bin' },
] as const;
