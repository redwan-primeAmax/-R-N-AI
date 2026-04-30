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
    if (!this.tokens) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });

    try {
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
    } catch (err) {
      console.warn("Google Drive Fetch failed:", err);
      // Return a fake response to avoid breaking callers
      return new Response(JSON.stringify({ error: "Network error" }), { status: 503 });
    }
  }

  private async refreshAccessToken() {
    if (!this.tokens?.refresh_token) throw new Error("No refresh token available");

    try {
      const response = await fetch('/api/auth/google/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.tokens.refresh_token })
      }).catch(err => {
        // Handle physical network failure/Failed to fetch
        console.warn("Network error during token refresh:", err);
        throw new Error("Physical network error during token refresh");
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error_description || errorData.error || "Failed to refresh token: " + response.status;
        
        // If token is invalid/revoked, we should probably signal this
        const lowerError = errorMessage.toLowerCase();
        if (lowerError.includes('invalid_grant') || 
            lowerError.includes('expired') || 
            lowerError.includes('revoked') ||
            response.status === 400 || 
            response.status === 401) {
          this.tokens = null;
          if (window) {
            window.dispatchEvent(new CustomEvent('google-session-invalid'));
          }
        }
        
        throw new Error(errorMessage);
      }
      
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

  async getRegistryFile(): Promise<{ id: string, data: any } | null> {
    const parentId = await this.getAppFolderId();
    const query = `name = 'registry.json' and '${parentId}' in parents and trashed = false`;
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)`);
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      const fileId = data.files[0].id;
      const contentResponse = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
      const registryData = await contentResponse.json();
      return { id: fileId, data: registryData };
    }
    return null;
  }

  async saveRegistryFile(registryData: any): Promise<void> {
    const registry = await this.getRegistryFile();
    await this.saveFile('registry.json', registryData, undefined, 'application/json', registry?.id);
  }

  async getNoteFolder(noteId: string): Promise<string> {
    const appFolderId = await this.getAppFolderId();
    const notesFolderId = await this.getSubFolderId('notes', appFolderId);
    return await this.getSubFolderId(noteId, notesFolderId);
  }

  async getNoteAssetsFolder(noteId: string): Promise<string> {
    const noteFolderId = await this.getNoteFolder(noteId);
    return await this.getSubFolderId('assets', noteFolderId);
  }

  async listFiles(folderId?: string, querySuffix: string = ''): Promise<any[]> {
    const parentId = folderId || await this.getAppFolderId();
    let query = `'${parentId}' in parents and trashed = false`;
    if (querySuffix) query += ` and ${querySuffix}`;
    
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, mimeType, appProperties)`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.files || [];
  }

  async deleteFile(fileId: string): Promise<void> {
    await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE'
    });
  }

  async renameFile(fileId: string, newName: string): Promise<void> {
    await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });
  }

  async saveFile(name: string, content: any, folderId?: string, mimeType: string = 'application/json', fileId?: string, appProperties?: Record<string, string>): Promise<string> {
    const parentId = folderId || await this.getAppFolderId();
    
    let targetFileId = fileId;

    if (!targetFileId && appProperties?.noteId) {
      // Search by noteId property for maximum reliability
      const query = `appProperties has { key='noteId' and value='${appProperties.noteId}' } and '${parentId}' in parents and trashed = false`;
      const searchResponse = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        targetFileId = searchData.files[0].id;
      }
    }

    if (!targetFileId && !appProperties?.noteId) {
      // Fallback: Check if file exists by name if ID not provided
      const query = `name = '${name}' and '${parentId}' in parents and trashed = false`;
      const searchResponse = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
      const searchData = await searchResponse.json();
      if (searchData.files && searchData.files.length > 0) {
        targetFileId = searchData.files[0].id;
      }
    }

    const metadata: any = {
      name: name,
      appProperties: appProperties,
      parents: targetFileId ? undefined : [parentId]
    };

    // Prepare content - if it's a string, use it directly, otherwise stringify as JSON
    const finalContent = typeof content === 'string' ? content : JSON.stringify(content);
    
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    body.append('file', new Blob([finalContent], { type: mimeType }));

    if (targetFileId) {
      // 1. Update Metadata first
      await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${targetFileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });

      // 2. Update Content
      const response = await this.fetchWithAuth(`https://www.googleapis.com/upload/drive/v3/files/${targetFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': mimeType },
        body: finalContent
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

  /**
   * Generates a unique 15-character ID for media files
   */
  private generateMediaId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 15; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async uploadMedia(blob: Blob, folderType: 'Images' | 'Video' | 'Audio', appProperties?: Record<string, string>, overrideParentId?: string): Promise<{ id: string; url: string }> {
    let targetFolderId = overrideParentId;
    
    if (!targetFolderId) {
      const parentId = await this.getAppFolderId();
      const mediaRootId = await this.getSubFolderId('Media', parentId);
      targetFolderId = await this.getSubFolderId(folderType, mediaRootId);
    }
    
    const mediaId = this.generateMediaId();
    const extension = blob.type.split('/')[1] || 'bin';
    const name = `${mediaId}.${extension}`;

    const metadata = {
      name: name,
      parents: [targetFolderId],
      appProperties: {
        ...appProperties,
        mediaId: mediaId,
        uploadedAt: Date.now().toString()
      }
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', blob);

    const response = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Failed to upload media to Drive');
    const data = await response.json();
    return { 
      id: data.id, 
      url: `https://lh3.googleusercontent.com/u/0/d/${data.id}` // Direct view URL pattern
    };
  }

  async getSubFolderId(name: string, parentFolderId?: string): Promise<string> {
    const parentId = parentFolderId || await this.getAppFolderId();
    const query = `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create folder if not exists
    const createResponse = await this.fetchWithAuth('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      })
    });
    const folder = await createResponse.json();
    return folder.id;
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
