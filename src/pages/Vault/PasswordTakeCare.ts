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
    return master === password;
  },
  
  setMasterPassword: async (password: string): Promise<void> => {
    const user = await DataManager.getUser();
    if (user) {
      await DataManager.updateUser({ ...user, masterPassword: password });
    }
  },

  hasMasterPassword: async (): Promise<boolean> => {
    const pwd = await PasswordTakeCare.getMasterPassword();
    return !!pwd;
  }
};
