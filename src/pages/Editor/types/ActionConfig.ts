/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ActionConfig {
  icon: any;
  label: string | ((...args: any[]) => string);
  subtitle: string | ((...args: any[]) => string);
  onClick: (...args: any[]) => void;
  danger?: boolean;
}
