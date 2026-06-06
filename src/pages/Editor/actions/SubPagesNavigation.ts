/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileText } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const subPagesNavigation: ActionConfig = {
  icon: FileText,
  label: 'অনুষঙ্গিক পাতা সমূহ (Sub Pages)',
  subtitle: (count: number) => `${count}টি অনুষঙ্গিক পাতা সংযুক্ত আছে`,
  onClick: (setViewMode: any) => setViewMode('subpages')
};
