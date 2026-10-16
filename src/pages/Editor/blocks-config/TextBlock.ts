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

import { Type } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const textBlock: BlockConfig = {
  label: 'Text',
  icon: Type,
  action: (editor: any) => editor.chain().focus().setParagraph().run(),
  description: 'Just start writing with plain text.'
};
