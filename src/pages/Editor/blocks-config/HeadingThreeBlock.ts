/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Heading3 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const headingThreeBlock: BlockConfig = {
  label: 'Heading 3',
  icon: Heading3,
  action: (editor: any) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  description: 'Smaller section heading.'
};
