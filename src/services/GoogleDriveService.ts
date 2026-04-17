import localforage from 'localforage';
import { Note, Workspace, DataManager } from '../utils/DataManager';

const DRIVE_TOKENS_KEY = 'google_drive_tokens';
const DRIVE_APP_DATA_FOLDER = 'appDataFolder';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  created_at?: number;
}

export class GoogleDriveService {
  private static async getTokens(): Promise<GoogleTokens | null> {
    const tokens = await localforage.getItem<GoogleTokens>(DRIVE_TOKENS_KEY);
    if (!tokens) return null;

    // Check if expired
    const now = Date.now();
    const createdAt = tokens.created_at || now;
    if (now > createdAt + tokens.expires_in * 1000) {
      // Token expired, need to refresh (implementing refresh if needed, but for now just return null)
      // Actually, we should probably handle refresh token here if it exists
      return null; 
    }
    return tokens;
  }

  static async saveTokens(tokens: GoogleTokens) {
    await localforage.setItem(DRIVE_TOKENS_KEY, {
      ...tokens,
      created_at: Date.now()
    });
  }

  static async disconnect() {
    await localforage.removeItem(DRIVE_TOKENS_KEY);
  }

  static async isConnected(): Promise<boolean> {
    const tokens = await this.getTokens();
    return !!tokens;
  }

  private static async fetchWithToken(url: string, options: RequestInit = {}) {
    const tokens = await this.getTokens();
    if (!tokens) throw new Error('Not connected to Google Drive');

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${tokens.access_token}`
    };

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      // Unauthorized, token might have expired while we were using it
      await this.disconnect();
      throw new Error('Google Drive session expired. Please reconnect.');
    }
    return response;
  }

  static async getFileInfo(fileName: string): Promise<any | null> {
    const response = await this.fetchWithToken(
      `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and trashed=false&spaces=appDataFolder`
    );
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  static async uploadFile(fileName: string, content: any) {
    const existingFile = await this.getFileInfo(fileName);
    const metadata = {
      name: fileName,
      parents: [DRIVE_APP_DATA_FOLDER]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const contentType = 'application/json';
    const body =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + contentType + '\r\n\r\n' +
      JSON.stringify(content) +
      close_delim;

    const url = existingFile 
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    const response = await this.fetchWithToken(url, {
      method: existingFile ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to upload to Google Drive');
    }
    return response.json();
  }

  static async downloadFile(fileId: string): Promise<any> {
    const response = await this.fetchWithToken(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );
    if (!response.ok) throw new Error('Failed to download from Google Drive');
    return response.json();
  }

  static async syncNotesToCloud() {
    const data = await DataManager.exportAllData();
    const backupData = {
      ...data,
      exportedAt: Date.now()
    };
    await this.uploadFile('rn_ai_notes_backup.json', backupData);
  }

  static async syncNotesFromCloud(): Promise<{ notes: Note[], workspaces: Workspace[] } | null> {
    const file = await this.getFileInfo('rn_ai_notes_backup.json');
    if (!file) return null;
    const data = await this.downloadFile(file.id);
    return data;
  }
}
