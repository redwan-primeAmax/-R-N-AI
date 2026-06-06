/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { List } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const bulletListBlock: BlockConfig = {
  label: 'Bullet List',
  icon: List,
  action: (editor: any) => editor.chain().focus().toggleBulletList().run(),
  description: 'Simple bulleted list.'
};
