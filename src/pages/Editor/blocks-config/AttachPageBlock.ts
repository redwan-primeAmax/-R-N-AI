/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FilePlus } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const attachPageBlock: BlockConfig = {
  label: 'Attach Page',
  icon: FilePlus,
  action: () => (window as any).editorEvents?.emit('attachSubPage'),
  description: 'Link an existing page as sub-page.'
};
