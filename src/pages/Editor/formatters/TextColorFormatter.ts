/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { syncBlockContent } from './SyncBlockContent';

export function setTextColor(editor: any, color: string) {
  document.execCommand('foreColor', false, color);
  syncBlockContent(editor, document.activeElement as HTMLElement);
}
