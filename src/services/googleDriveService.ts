/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { googleSignIn, googleSignOut, getStoredAccessToken } from './firebaseAuth';
import { DataManager } from './storage/DataManager';

const BACKUP_FILENAME = 'Redwan_Note_Backup.redwan';

export interface DriveUserInfo {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  lastSyncedAt?: number;
}

export class GoogleDriveService {
  /**
   * Connect to Google Drive, check for existing backup on Drive.
   * Returns user info and existing backup content if found.
   */
  static async connectAndSync(): Promise<{
    user: DriveUserInfo;
    existingBackupFound: boolean;
    backupData?: string;
  }> {
    const { user, accessToken } = await googleSignIn();

    const userInfo: DriveUserInfo = {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      lastSyncedAt: Date.now()
    };

    localStorage.setItem('gd_connected_user', JSON.stringify(userInfo));

    // Check if backup file exists on Drive
    const existingFile = await this.findBackupFile(accessToken);

    if (existingFile) {
      // Download content
      const content = await this.downloadFileContent(accessToken, existingFile.id);
      return {
        user: userInfo,
        existingBackupFound: true,
        backupData: content
      };
    } else {
      // Create initial backup on Drive from local data
      const localExport = await DataManager.exportAllData();
      await this.uploadBackupFile(accessToken, localExport);
      userInfo.lastSyncedAt = Date.now();
      localStorage.setItem('gd_connected_user', JSON.stringify(userInfo));

      return {
        user: userInfo,
        existingBackupFound: false
      };
    }
  }

  /**
   * Finds backup file on Drive
   */
  static async findBackupFile(accessToken: string): Promise<{ id: string; name: string; modifiedTime: string } | null> {
    const query = encodeURIComponent(`name = '${BACKUP_FILENAME}' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      throw new Error(`Drive search failed: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  }

  /**
   * Downloads file content from Drive
   */
  static async downloadFileContent(accessToken: string, fileId: string): Promise<string> {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      throw new Error(`Drive download failed: ${res.statusText}`);
    }

    return await res.text();
  }

  /**
   * Uploads or updates backup file on Drive
   */
  static async uploadBackupFile(accessToken: string, content: string): Promise<void> {
    const existing = await this.findBackupFile(accessToken);

    if (existing) {
      // Update media
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream'
        },
        body: content
      });

      if (!res.ok) {
        throw new Error(`Drive update failed: ${res.statusText}`);
      }
    } else {
      // Multipart upload
      const metadata = {
        name: BACKUP_FILENAME,
        mimeType: 'application/octet-stream'
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/octet-stream\r\n\r\n' +
        content +
        closeDelimiter;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!res.ok) {
        throw new Error(`Drive upload failed: ${res.statusText}`);
      }
    }

    // Update lastSyncedAt in localStorage
    const saved = localStorage.getItem('gd_connected_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.lastSyncedAt = Date.now();
      localStorage.setItem('gd_connected_user', JSON.stringify(parsed));
    }
  }

  /**
   * Restores data from Drive backup
   */
  static async restoreFromDrive(): Promise<boolean> {
    let token = getStoredAccessToken();
    if (!token) {
      const { accessToken } = await googleSignIn();
      token = accessToken;
    }

    const file = await this.findBackupFile(token);
    if (!file) {
      throw new Error('গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি।');
    }

    const content = await this.downloadFileContent(token, file.id);
    await DataManager.importAllData(content);
    return true;
  }

  /**
   * Syncs local data to Drive
   */
  static async syncToDrive(): Promise<void> {
    let token = getStoredAccessToken();
    if (!token) {
      const { accessToken } = await googleSignIn();
      token = accessToken;
    }

    const exportData = await DataManager.exportAllData();
    await this.uploadBackupFile(token, exportData);
  }

  /**
   * Gets connected user info
   */
  static getConnectedUser(): DriveUserInfo | null {
    const saved = localStorage.getItem('gd_connected_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  /**
   * Disconnects Google Drive
   */
  static async disconnect(): Promise<void> {
    await googleSignOut();
  }
}
