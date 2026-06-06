/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExternalLink } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const embedBlockConfig: BlockConfig = {
  label: 'Embed Link integration',
  icon: ExternalLink,
  iconClass: 'text-blue-400',
  action: (editor: any) => (editor.chain().focus() as any).insertEmbed().run(),
  description: 'Embed Figma, Google Drive documents, or raw web links.'
};
