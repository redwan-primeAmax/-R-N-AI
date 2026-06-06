/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Users } from 'lucide-react';

export const shareCollabAction = {
  icon: Users,
  label: (isActive: boolean) => isActive ? 'Live Collaboration (Active)' : 'Share Note Live',
  subtitle: (isActive: boolean) => isActive ? 'P2P host is online and running' : 'Sync live with friends/colleagues via safe P2P',
  onClick: (onStartCollab: any) => {
    if (onStartCollab) onStartCollab();
  }
};
