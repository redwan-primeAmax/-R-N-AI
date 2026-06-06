/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Database } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const databaseBlockConfig: BlockConfig = {
  label: 'Interactive Database Views',
  icon: Database,
  iconClass: 'text-purple-500',
  action: (editor: any) => (editor.chain().focus() as any).insertDatabase().run(),
  description: 'Fully responsive table, timeline, kanban, or calendar views.'
};
