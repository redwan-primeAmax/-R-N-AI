/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClipboardCopy, Check } from 'lucide-react';
import { EditorBlock, blocksToHtml } from '../../../utils/blockParser';

export const copyContentAction = {
  icon: (isCopied: boolean) => isCopied ? Check : ClipboardCopy,
  label: "কপি পেজ কন্টেন্ট (Copy Content)",
  subtitle: "পুরো পেজের টেক্সট কপি করুন",
  onClick: async (blocks: EditorBlock[], setCopied: (v: boolean) => void) => {
    const text = blocks.map(b => {
      // Strip HTML
      const plain = b.content.replace(/<[^>]*>/g, '');
      return plain;
    }).filter(t => t.trim() !== '').join('\n');
    
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
};
