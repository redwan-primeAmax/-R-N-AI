/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemeMetadata {
  id: string;
  name: string;
  description: string;
  previewColor: string;
  previewClassName?: string;
}

export interface ThemeConfig extends ThemeMetadata {
  className: string;
}
