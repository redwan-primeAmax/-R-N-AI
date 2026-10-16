/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { MessageSquare } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const calloutBlock: BlockConfig = {
  label: 'Callout',
  icon: MessageSquare,
  action: (editor: any) => (editor.chain().focus() as any).setCallout().run(),
  description: 'Make text stand out.'
};
