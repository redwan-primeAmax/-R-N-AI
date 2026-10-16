/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { Hash } from 'lucide-react';
import { ActionConfig } from '../types/ActionConfig';

export const tagAction: ActionConfig = {
  icon: Hash,
  label: 'ট্যাগ',
  subtitle: 'নোটের ট্যাগ সমূহ পরিবর্তন করুন',
  onClick: (onTag: () => void) => onTag()
};
