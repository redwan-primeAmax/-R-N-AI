/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ListTodo } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const todoListBlock: BlockConfig = {
  label: 'Todo List',
  icon: ListTodo,
  action: (editor: any) => editor.chain().focus().toggleTaskList().run(),
  description: 'Track tasks with checkboxes.'
};
