/**
 * Copyright © 2026 Redwan. All rights reserved.
 *
 * This source code is proprietary and confidential. No part of this
 * project may be copied, modified, distributed, or used in any form
 * without the prior written permission of the copyright holder.
 */

import { DataManager } from '../../services/storage/DataManager';
import { hashPassword, verifyPassword } from '../../utils/crypto';

export const PasswordTakeCare = {
  getMasterPassword: async (): Promise<string | null> => {
    const user = await DataManager.getUser();
    return user?.masterPassword || null;
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    const master = await PasswordTakeCare.getMasterPassword();
    if (!master) return false;

    const valid = await verifyPassword(password, master);
    if (valid && !master.startsWith('pbkdf2$')) {
      const user = await DataManager.getUser();
      await DataManager.updateUser({ ...user, masterPassword: await hashPassword(password) });
    }
    return valid;
  },

  setMasterPassword: async (password: string): Promise<void> => {
    if (password.length < 8) throw new Error('Use at least 8 characters.');
    const user = await DataManager.getUser();
    if (user) {
      const hashed = await hashPassword(password);
      await DataManager.updateUser({ ...user, masterPassword: hashed });
    }
  },

  hasMasterPassword: async (): Promise<boolean> => {
    const pwd = await PasswordTakeCare.getMasterPassword();
    return !!pwd;
  }
};
