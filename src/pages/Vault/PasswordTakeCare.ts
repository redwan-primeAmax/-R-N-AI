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
