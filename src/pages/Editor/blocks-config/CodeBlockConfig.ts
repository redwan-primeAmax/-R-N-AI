/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Code } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const codeBlockConfig: BlockConfig = {
  label: 'Code Block',
  icon: Code,
  action: (editor: any) => editor.chain().focus().toggleCodeBlock().run(),
  description: 'Syntax highlighted code.'
};
