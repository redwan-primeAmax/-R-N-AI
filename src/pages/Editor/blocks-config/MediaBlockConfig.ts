/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImageIcon } from 'lucide-react';
import { BlockConfig } from '../types/BlockConfig';

export const mediaBlockConfig: BlockConfig = {
  label: 'Image, Video or File',
  icon: ImageIcon,
  action: (editor: any, fileInputRef: any) => {
    if (fileInputRef && fileInputRef.current) {
      fileInputRef.current.click();
    }
  },
  description: 'Upload media content.'
};
