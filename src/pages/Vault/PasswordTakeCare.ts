/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager } from '../../services/storage/DataManager';
import { hashPassword } from '../../utils/crypto';

export const PasswordTakeCare = {
  getMasterPassword: async (): Promise<string | null> => {
    const user = await DataManager.getUser();
    return user?.masterPassword || null;
  },

  verifyPassword: async (password: string): Promise<boolean> => {
    const master = await PasswordTakeCare.getMasterPassword();
    if (!master) return false;

    // New SHA-256 based check
    const hashed = await hashPassword(password);
    if (master === hashed) return true;

    // Legacy fallback (old manual hash) — auto-migrates on success
    if (master.includes('$')) {
      const [salt, hash] = master.split('$');
      const combined = password + salt;
      let calculated = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        calculated = ((calculated << 5) - calculated) + char;
        calculated |= 0;
      }
      if (Math.abs(calculated).toString(16) === hash) {
        await PasswordTakeCare.setMasterPassword(password);
        return true;
      }
    }
    return false;
  },

  setMasterPassword: async (password: string): Promise<void> => {
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
