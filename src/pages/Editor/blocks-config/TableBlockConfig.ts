/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Table } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const tableBlockConfig: BlockConfig = {
  label: 'Table',
  icon: Table,
  action: (editor: any) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  description: 'Grid based information.'
};
