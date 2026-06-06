/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { syncBlockContent } from './SyncBlockContent';

export function toggleStrike(editor: any) {
  const activeEl = document.activeElement as HTMLElement;
  if (!activeEl || !activeEl.hasAttribute('contenteditable')) {
    editor.chain().focus();
  }
  document.execCommand('strikeThrough', false);
  syncBlockContent(editor, document.activeElement as HTMLElement);
}

export function isStrikeActive(): boolean {
  return document.queryCommandState?.('strikeThrough') || false;
}
