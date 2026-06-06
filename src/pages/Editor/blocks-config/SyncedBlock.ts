/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RefreshCw } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const syncedBlock: BlockConfig = {
  label: 'Synced Block',
  icon: RefreshCw,
  iconClass: 'text-orange-400',
  action: (editor: any) => (editor.chain().focus() as any).setSynced().run(),
  description: 'Sync edits across document scopes in real-time.'
};
