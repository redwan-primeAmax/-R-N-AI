/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

export interface BlockConfig {
  label: string;
  icon: any;
  iconClass?: string;
  action: (editor: any, ...args: any[]) => void;
  description: string;
  section?: 'basic' | 'advance' | 'toggle';
}
