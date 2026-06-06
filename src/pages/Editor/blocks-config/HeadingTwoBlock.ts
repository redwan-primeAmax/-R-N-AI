/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Heading2 } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const headingTwoBlock: BlockConfig = {
  label: 'Heading 2',
  icon: Heading2,
  action: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  description: 'Medium section heading.'
};
