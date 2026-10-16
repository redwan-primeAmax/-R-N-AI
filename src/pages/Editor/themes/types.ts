/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
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
