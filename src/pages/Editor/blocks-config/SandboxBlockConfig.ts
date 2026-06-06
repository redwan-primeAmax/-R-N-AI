/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Code } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const sandboxBlockConfig: BlockConfig = {
  label: 'Interactive Code Sandbox',
  icon: Code,
  iconClass: 'text-[#00E5FF]',
  action: (editor: any) => (editor.chain().focus() as any).setSandbox().run(),
  description: 'Write raw HTML/JS/CSS and execute it inside an isolated iframe.'
};
