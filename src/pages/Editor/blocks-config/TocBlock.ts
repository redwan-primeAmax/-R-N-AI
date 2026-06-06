/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlignLeft } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const tocBlock: BlockConfig = {
  label: 'Table of Contents',
  icon: AlignLeft,
  action: (editor: any) => (editor.chain().focus() as any).setToc().run(),
  description: 'Dynamic heading-based summary list.'
};
