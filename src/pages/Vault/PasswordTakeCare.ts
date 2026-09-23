/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager } from '../../services/storage/DataManager';
import { WasmBridgeService } from '../../wasm/WasmModule';

export const PasswordTakeCare = {
  getMasterPassword: async (): Promise<string | null> => {
    const user = await DataManager.getUser();
    return user?.masterPassword || null;
  },
  
  verifyPassword: async (password: string): Promise<boolean> => {
    const master = await PasswordTakeCare.getMasterPassword();
    if (!master) return false;
    
    // Use C++ WebAssembly crypto verification if hashed, or direct match
    if (master.includes('$')) {
      const [salt, hash] = master.split('$');
      return WasmBridgeService.verifyPassword(password, hash, salt);
    }
    
    return master === password;
  },
  
  setMasterPassword: async (password: string): Promise<void> => {
    const user = await DataManager.getUser();
    if (user) {
      // Hash password using C++ WebAssembly crypto vault engine with 16-char salt
      const salt = WasmBridgeService.generateSalt();
      const hash = WasmBridgeService.hashPassword(password, salt);
      const secureMaster = `${salt}$${hash}`;
      await DataManager.updateUser({ ...user, masterPassword: secureMaster });
    }
  },

  hasMasterPassword: async (): Promise<boolean> => {
    const pwd = await PasswordTakeCare.getMasterPassword();
    return !!pwd;
  }
};

