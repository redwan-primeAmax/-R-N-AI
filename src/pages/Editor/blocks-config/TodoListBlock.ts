/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { ListTodo } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const todoListBlock: BlockConfig = {
  label: 'Todo List',
  icon: ListTodo,
  action: (editor: any) => editor.chain().focus().toggleTaskList().run(),
  description: 'Track tasks with checkboxes.'
};
