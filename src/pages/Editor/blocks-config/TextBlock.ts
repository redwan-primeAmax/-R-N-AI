/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Type } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const textBlock: BlockConfig = {
  label: 'Text',
  icon: Type,
  action: (editor: any) => editor.chain().focus().setParagraph().run(),
  description: 'Just start writing with plain text.'
};
