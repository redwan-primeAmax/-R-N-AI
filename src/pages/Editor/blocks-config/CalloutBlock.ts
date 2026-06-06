/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MessageSquare } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const calloutBlock: BlockConfig = {
  label: 'Callout',
  icon: MessageSquare,
  action: (editor: any) => (editor.chain().focus() as any).setCallout().run(),
  description: 'Make text stand out.'
};
