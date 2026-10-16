/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { AlignLeft } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const tocBlock: BlockConfig = {
  label: 'Table of Contents',
  icon: AlignLeft,
  action: (editor: any) => (editor.chain().focus() as any).setToc().run(),
  description: 'Dynamic heading-based summary list.'
};
