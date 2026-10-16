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

import { Hash } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const tagAction: ActionConfig = {
  icon: Hash,
  label: 'ট্যাগ',
  subtitle: 'নোটের ট্যাগ সমূহ পরিবর্তন করুন',
  onClick: (onTag: () => void) => onTag()
};
