/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

export interface ActionConfig {
  icon: any;
  label: string | ((...args: any[]) => string);
  subtitle: string | ((...args: any[]) => string);
  onClick: (...args: any[]) => void;
  danger?: boolean;
}
