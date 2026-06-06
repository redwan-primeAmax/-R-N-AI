/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BlockConfig {
  label: string;
  icon: any;
  iconClass?: string;
  action: (editor: any, ...args: any[]) => void;
  description: string;
  section?: 'basic' | 'advance' | 'toggle';
}
