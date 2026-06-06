/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { syncBlockContent } from './SyncBlockContent';

export function toggleItalic(editor: any) {
  const activeEl = document.activeElement as HTMLElement;
  if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
    editor.chain().focus();
  }
  document.execCommand('italic', false);
  syncBlockContent(editor, document.activeElement as HTMLElement);
}

export function isItalicActive(): boolean {
  return document.queryCommandState?.('italic') || false;
}
