/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Quote } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const quoteBlock: BlockConfig = {
  label: 'Quote',
  icon: Quote,
  action: (editor: any) => editor.chain().focus().toggleBlockquote().run(),
  description: 'Capture a quotation.'
};
