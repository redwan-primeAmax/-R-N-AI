/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { syncBlockContent } from './SyncBlockContent';

export function setBackgroundColor(editor: any, color: string) {
  document.execCommand('backColor', false, color);
  syncBlockContent(editor, document.activeElement as HTMLElement);
}
