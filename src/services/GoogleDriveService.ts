/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  issued_at: number;
}

class GoogleDriveService {
  private tokens: GoogleTokens | null = null;
  private appFolderName = "Redwan Assistant Data";
  private appFolderId: string | null = null;

  setTokens(tokens: GoogleTokens) {
    this.tokens = tokens;
  }

  getTokens() {
    return this.tokens;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    if (!this.tokens) throw new Error("Not authenticated with Google");

    // Check if token is expired (giving 1 min buffer)
    const isExpired = Date.now() > (this.tokens.issued_at + (this.tokens.expires_in * 1000) - 60000);
    
    if (isExpired && this.tokens.refresh_token) {
      console.log("Access token expired, refreshing...");
      await this.refreshAccessToken();
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.tokens.access_token}`
    };

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      // If we get 401 even after "check", try one refresh
      if (this.tokens.refresh_token) {
        await this.refreshAccessToken();
        const retryHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${this.tokens.access_token}`
        };
        return fetch(url, { ...options, headers: retryHeaders });
      }
    }
    return response;
  }

  private async refreshAccessToken() {
    if (!this.tokens?.refresh_token) throw new Error("No refresh token available");

    try {
      const response = await fetch('/api/auth/google/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.tokens.refresh_token })
      });

      if (!response.ok) throw new Error("Failed to refresh token");
      const newTokens = await response.json();
      
      this.tokens = {
        ...this.tokens,
        ...newTokens,
        issued_at: Date.now()
      };

      // Notify caller to save tokens
      if (window) {
        window.dispatchEvent(new CustomEvent('google-tokens-updated', { detail: this.tokens }));
      }
    } catch (err) {
      console.error("Token refresh error:", err);
      throw err;
    }
  }

  async getAppFolderId(): Promise<string> {
    if (this.appFolderId) return this.appFolderId;

    const query = `name = '${this.appFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      this.appFolderId = data.files[0].id;
      return this.appFolderId!;
    }

    // Create folder if not exists
    const createResponse = await this.fetchWithAuth('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.appFolderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    const folder = await createResponse.json();
    this.appFolderId = folder.id;
    return this.appFolderId!;
  }

  async saveFile(name: string, content: any, folderId?: string): Promise<string> {
    const parentId = folderId || await this.getAppFolderId();
    
    // Check if file exists
    const query = `name = '${name}' and '${parentId}' in parents and trashed = false`;
    const searchResponse = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
    const searchData = await searchResponse.json();

    const metadata = {
      name: name,
      parents: [parentId]
    };
    
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    body.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

    if (searchData.files && searchData.files.length > 0) {
      // Update existing
      const fileId = searchData.files[0].id;
      const response = await this.fetchWithAuth(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
        method: 'PATCH',
        body: body
      });
      const data = await response.json();
      return data.id;
    } else {
      // Create new
      const response = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        body: body
      });
      const data = await response.json();
      return data.id;
    }
  }

  async getFileContent<T>(name: string, folderId?: string): Promise<T | null> {
    const parentId = folderId || await this.getAppFolderId();
    const query = `name = '${name}' and '${parentId}' in parents and trashed = false`;
    const searchResponse = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
    const searchData = await searchResponse.json();

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      const contentResponse = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
      return await contentResponse.json();
    }
    return null;
  }
}

export const googleDriveService = new GoogleDriveService();
