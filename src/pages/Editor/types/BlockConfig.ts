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

export interface BlockConfig {
  label: string;
  icon: any;
  iconClass?: string;
  action: (editor: any, ...args: any[]) => void;
  description: string;
  section?: 'basic' | 'advance' | 'toggle';
}
