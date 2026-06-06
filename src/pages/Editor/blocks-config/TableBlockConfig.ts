/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Table } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const tableBlockConfig: BlockConfig = {
  label: 'Table',
  icon: Table,
  action: (editor: any) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  description: 'Grid based information.'
};
