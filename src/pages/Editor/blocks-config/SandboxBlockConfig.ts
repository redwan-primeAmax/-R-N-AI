/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
