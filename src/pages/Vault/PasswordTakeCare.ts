/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager } from '../../services/storage/DataManager';

export const PasswordTakeCare = {
  getMasterPassword: async (): Promise<string | null> => {
    const user = await DataManager.getUser();
    return user?.masterPassword || null;
  },
  
  verifyPassword: async (password: string): Promise<boolean> => {
    const master = await PasswordTakeCare.getMasterPassword();
    if (!master) return false;
    
    if (master.includes('$')) {
      const [salt, hash] = master.split('$');
      const combined = password + salt;
      let calculated = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        calculated = ((calculated << 5) - calculated) + char;
        calculated |= 0;
      }
      return Math.abs(calculated).toString(16) === hash;
    }
    
    return master === password;
  },
  
  setMasterPassword: async (password: string): Promise<void> => {
    const user = await DataManager.getUser();
    if (user) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let salt = '';
      for (let i = 0; i < 16; i++) {
        salt += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const combined = password + salt;
      let hashVal = 0;
      for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hashVal = ((hashVal << 5) - hashVal) + char;
        hashVal |= 0;
      }
      const hash = Math.abs(hashVal).toString(16);
      const secureMaster = `${salt}$${hash}`;
      await DataManager.updateUser({ ...user, masterPassword: secureMaster });
    }
  },

  hasMasterPassword: async (): Promise<boolean> => {
    const pwd = await PasswordTakeCare.getMasterPassword();
    return !!pwd;
  }
};

