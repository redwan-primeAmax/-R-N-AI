/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Plus } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const createSubPageBlock: BlockConfig = {
  label: 'Create Sub Page',
  icon: Plus,
  action: () => (window as any).editorEvents?.emit('createSubPage'),
  description: 'Create a new linked sub-page.'
};
