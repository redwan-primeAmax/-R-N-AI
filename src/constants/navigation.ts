/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sparkles, Bookmark, Lock, Wrench, Settings, Trash2, FileText, Search } from 'lucide-react';

export const MAIN_NAV_ITEMS = [
  { icon: FileText, label: 'নোটস', path: '/main' },
  { icon: Search, label: 'সার্চ', path: '/search' },
] as const;

export const SIDEBAR_MENU_ITEMS = [
  { icon: Sparkles, label: 'AI সহকারী ও চ্যাট', path: '/ai-chat' },
  { icon: Bookmark, label: 'বুকমার্কসমূহ', path: '/bookmarks' },
  { icon: Lock, label: 'সিকিউর ভল্ট (লকড)', path: '/vault' },
  { icon: Wrench, label: 'টুলস সেকশন', path: '/tools' },
  { icon: Settings, label: 'অ্যাপ সেটিংস', path: '/settings' },
  { icon: Trash2, label: 'রিসাইকেল বিন', path: '/recycle-bin' },
] as const;
