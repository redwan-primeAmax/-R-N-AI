/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Heading1 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const headingOneBlock: BlockConfig = {
  label: 'Heading 1',
  icon: Heading1,
  action: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  description: 'Big section heading.'
};
