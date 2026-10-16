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

import { FileText } from 'lucide-react';
import { t as tr } from '../../../utils/translator';
import { ActionConfig } from '../types/ActionConfig';

export const subPagesNavigation: ActionConfig = {
  icon: FileText,
  get label() { return tr('sheet.subpagesHeader'); },
  subtitle: (count: number) => tr('actions.subpagesAttached', { count }),
  onClick: (setViewMode: any) => setViewMode('subpages')
};
