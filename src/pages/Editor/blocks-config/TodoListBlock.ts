/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — NO LICENSE IS GRANTED.
 * This work is the exclusive property of Redwan. Copying, reproducing,
 * reusing, modifying, distributing, publishing, selling, sublicensing,
 * reverse-engineering, rebranding, removing this notice, or claiming
 * this work, in whole or in part, as anyone else's own is strictly
 * prohibited without Redwan's prior written permission.
 */

import { ListTodo } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const todoListBlock: BlockConfig = {
  label: 'Todo List',
  icon: ListTodo,
  action: (editor: any) => editor.chain().focus().toggleTaskList().run(),
  description: 'Track tasks with checkboxes.'
};
