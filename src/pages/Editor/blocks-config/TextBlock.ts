/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Type } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const textBlock: BlockConfig = {
  label: 'Text',
  icon: Type,
  action: (editor: any) => editor.chain().focus().setParagraph().run(),
  description: 'Just start writing with plain text.'
};
