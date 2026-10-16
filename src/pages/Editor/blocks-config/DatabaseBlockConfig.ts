/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
