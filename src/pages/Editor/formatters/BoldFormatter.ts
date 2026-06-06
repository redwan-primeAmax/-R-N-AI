/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { syncBlockContent } from './SyncBlockContent';

export function toggleBold(editor: any) {
  const activeEl = document.activeElement as HTMLElement;
  if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
    editor.chain().focus();
  }
  document.execCommand('bold', false);
  syncBlockContent(editor, document.activeElement as HTMLElement);
}

export function isBoldActive(): boolean {
  return document.queryCommandState?.('bold') || false;
}
