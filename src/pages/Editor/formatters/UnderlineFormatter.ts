/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { syncBlockContent } from './SyncBlockContent';

export function toggleUnderline(editor: any) {
  const activeEl = document.activeElement as HTMLElement;
  if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
    editor.chain().focus();
  }
  document.execCommand('underline', false);
  syncBlockContent(editor, document.activeElement as HTMLElement);
}

export function isUnderlineActive(): boolean {
  return document.queryCommandState?.('underline') || false;
}
