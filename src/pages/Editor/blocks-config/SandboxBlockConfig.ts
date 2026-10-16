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

import { Code } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const sandboxBlockConfig: BlockConfig = {
  label: 'Interactive Code Sandbox',
  icon: Code,
  iconClass: 'text-[#00E5FF]',
  action: (editor: any) => (editor.chain().focus() as any).setSandbox().run(),
  description: 'Write raw HTML/JS/CSS and execute it inside an isolated iframe.'
};
