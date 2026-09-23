/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../DexieDB';
import { AISettings, UserPreferences } from '../../../types';
import { uint8ArrayToBase64, base64ToUint8Array } from '../../../utils/binaryUtils';

const SALT = 'redwan-salt-v2';
let derivedKeyCache: CryptoKey | null = null;

export async function getEncryptionKey(): Promise<CryptoKey> {
  if (derivedKeyCache) return derivedKeyCache;

  let customKey = 'default-fallback-key-should-be-randomized';
  let customSalt = SALT;
  try {
    const storedKey = await db.key_value_pairs.get('user_encryption_key_seed');
    if (storedKey && storedKey.value) {
      customKey = storedKey.value;
    } else {
      const randomSeed = crypto.randomUUID() + '-' + crypto.randomUUID();
      await db.key_value_pairs.put({ key: 'user_encryption_key_seed', value: randomSeed });
      customKey = randomSeed;
    }

    const storedSalt = await db.key_value_pairs.get('user_encryption_salt_seed');
    if (storedSalt && storedSalt.value) {
      customSalt = storedSalt.value;
    } else {
      const randomSalt = crypto.randomUUID();
      await db.key_value_pairs.put({ key: 'user_encryption_salt_seed', value: randomSalt });
      customSalt = randomSalt;
    }
  } catch (e) {
    console.error('SettingsService: Critical error fetching encryption keys:', e);
    throw new Error('Encryption initialization failed');
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(customKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  derivedKeyCache = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(customSalt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  return derivedKeyCache;
}

export async function encryptText(text: string): Promise<string> {
  if (!text) return '';
  try {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(text)
    );

    // Combine IV and Encrypted data safely
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Use chunked uint8ArrayToBase64 to prevent stack overflow on large text
    return uint8ArrayToBase64(combined);
  } catch (e) {
    console.error('SettingsService: Encryption failed:', e);
    return '';
  }
}

export async function decryptText(encoded: string): Promise<string> {
  if (!encoded) return '';
  try {
    if (encoded.length < 28) return encoded;

    let combined: Uint8Array;
    try {
      combined = base64ToUint8Array(encoded);
    } catch {
      return encoded; // Return original if not valid base64
    }

    if (combined.length < 28) return encoded;

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const key = await getEncryptionKey();
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return encoded; // Fallback gracefully if plain text
  }
}

let cachedSettings: AISettings | null = null;

export const SettingsService = {
  async getUserName(): Promise<string | null> {
    const record = await db.key_value_pairs.get('user_name');
    const name = record ? record.value : null;
    if (!name) return null;
    if (name.length > 8) {
      return name.substring(0, 8) + '...';
    }
    return name;
  },

  async getFullUserName(): Promise<string | null> {
    const record = await db.key_value_pairs.get('user_name');
    return record ? record.value : null;
  },

  async saveUserName(name: string): Promise<void> {
    await db.key_value_pairs.put({ key: 'user_name', value: name });
  },

  async getUserPreferences(): Promise<UserPreferences> {
    const record = await db.key_value_pairs.get('user_preferences');
    const prefs = record ? record.value : null;
    return prefs || { reducedMotion: false, theme: 'dark' };
  },

  async saveUserPreferences(prefs: UserPreferences): Promise<void> {
    await db.key_value_pairs.put({ key: 'user_preferences', value: prefs });
  },

  async getUserProfile(): Promise<any> {
    const record = await db.key_value_pairs.get('master_user_profile');
    if (!record) {
      const initial = { id: 'user-0', masterPassword: '' };
      await db.key_value_pairs.put({ key: 'master_user_profile', value: initial });
      return initial;
    }
    return record.value;
  },

  async updateUserProfile(user: any): Promise<void> {
    await db.key_value_pairs.put({ key: 'master_user_profile', value: user });
  },

  async getSystemConfig(): Promise<any> {
    const record = await db.key_value_pairs.get('system_config');
    const config = record ? record.value : null;
    if (!config) {
      const defaultConfig = { activeWorkspaceId: 'default', noteLimitPerWorkspace: 10000 };
      await db.key_value_pairs.put({ key: 'system_config', value: defaultConfig });
      return defaultConfig;
    }
    return config;
  },

  async saveSystemConfig(config: any): Promise<void> {
    await db.key_value_pairs.put({ key: 'system_config', value: config });
  },

  async getAISettings(): Promise<AISettings> {
    if (cachedSettings) return cachedSettings;

    const record = await db.key_value_pairs.get('ai_settings');
    const settings = record ? record.value as AISettings : null;
    const defaultSettings: AISettings = {
      controlMode: 'auto',
      selectedProvider: 'gemini',
      selectedModels: {
        gemini: 'gemini-1.5-flash',
        openrouter: '',
        fireworks: 'accounts/fireworks/models/deepseek-v3p1',
        local: ''
      },
      apiKeys: {},
      enabledProviders: ['gemini', 'openrouter', 'fireworks'],
      dataCheckingEnabled: false,
      dataCheckingModel: 'free',
      retrySettings: { enabled: false, errorCodes: '' },
      selectedAppID: 'threat-all',
      customAppIDs: [],
      models: {
        gemini: 'gemini-1.5-flash',
        openrouter: '',
        fireworks: 'accounts/fireworks/models/deepseek-v3p1',
        local: ''
      },
      systemPrompt: 'আপনি একজন দক্ষ ব্যক্তিগত সহকারী। আপনি ব্যবহারকারীকে নিখুঁত এবং স্মার্ট উত্তর দিতে সাহায্য করেন।'
    };

    if (!settings) {
      await db.key_value_pairs.put({ key: 'ai_settings', value: defaultSettings });
      cachedSettings = defaultSettings;
      return defaultSettings;
    }

    // Decrypt API keys
    const decryptedKeys: Record<string, string> = {};
    if (settings.apiKeys) {
      await Promise.all(Object.keys(settings.apiKeys).map(async key => {
        const val = (settings.apiKeys as Record<string, string>)[key];
        decryptedKeys[key] = await decryptText(val);
      }));
    }

    const mergedSettings: AISettings = {
      ...defaultSettings,
      ...settings,
      selectedModels: {
        ...defaultSettings.selectedModels,
        ...(settings.selectedModels || {})
      },
      apiKeys: decryptedKeys,
      enabledProviders: ['gemini', 'openrouter', 'fireworks'],
      dataCheckingEnabled: settings.dataCheckingEnabled ?? defaultSettings.dataCheckingEnabled,
      dataCheckingModel: settings.dataCheckingModel || defaultSettings.dataCheckingModel,
      dataCheckingCustomProvider: settings.dataCheckingCustomProvider || 'gemini',
      retrySettings: settings.retrySettings || defaultSettings.retrySettings,
      selectedAppID: settings.selectedAppID || defaultSettings.selectedAppID,
      customAppIDs: settings.customAppIDs || defaultSettings.customAppIDs,
      models: settings.models || defaultSettings.models,
      systemPrompt: settings.systemPrompt || defaultSettings.systemPrompt
    };

    if (mergedSettings.selectedProvider as any === 'picoapps' || mergedSettings.selectedProvider === 'local') {
      mergedSettings.selectedProvider = 'gemini';
    }

    cachedSettings = mergedSettings;
    return mergedSettings;
  },

  async saveAISettings(settings: AISettings): Promise<void> {
    cachedSettings = settings;
    const encryptedKeys: Record<string, string> = {};
    if (settings.apiKeys) {
      await Promise.all(Object.keys(settings.apiKeys).map(async key => {
        const val = (settings.apiKeys as Record<string, string>)[key];
        encryptedKeys[key] = await encryptText(val);
      }));
    }

    const settingsToSave = { ...settings, apiKeys: encryptedKeys };
    await db.key_value_pairs.put({ key: 'ai_settings', value: settingsToSave });
  },

  invalidateSettingsCache() {
    cachedSettings = null;
  }
};
