/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { syncBlockContent } from './SyncBlockContent';

export function toggleCode(editor: any) {
  const activeEl = document.activeElement as HTMLElement;
  if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
    editor.chain().focus();
  }
  const isCode = document.queryCommandValue('fontName')?.toLowerCase()?.includes('monospace');
  document.execCommand('fontName', false, isCode ? 'inherit' : 'monospace');
  syncBlockContent(editor, document.activeElement as HTMLElement);
}

export function isCodeActive(): boolean {
  return document.queryCommandValue('fontName')?.toLowerCase()?.includes('monospace') || false;
}
