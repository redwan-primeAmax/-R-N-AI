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
