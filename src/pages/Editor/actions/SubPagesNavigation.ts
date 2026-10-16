/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { FileText } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const subPagesNavigation: ActionConfig = {
  icon: FileText,
  label: 'অনুষঙ্গিক পাতা সমূহ (Sub Pages)',
  subtitle: (count: number) => `${count}টি অনুষঙ্গিক পাতা সংযুক্ত আছে`,
  onClick: (setViewMode: any) => setViewMode('subpages')
};
