/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Hash } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const tagAction: ActionConfig = {
  icon: Hash,
  label: 'ট্যাগ',
  subtitle: 'নোটের ট্যাগ সমূহ পরিবর্তন করুন',
  onClick: (onTag: () => void) => onTag()
};
