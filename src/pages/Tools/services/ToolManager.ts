import localforage from 'localforage';
import JSZip from 'jszip';

export interface Tool {
  id: string;
  name: string;
  entryPoint: string; 
  files: Record<string, Blob>; // path -> Blob mapping
  createdAt: number;
  isFavorite?: boolean;
}

const TOOL_STORAGE_KEY = 'app_tools_data';

export class ToolManager {
  private static storage = localforage.createInstance({
    name: 'ToolManager',
    storeName: 'tools'
  });

  static async uploadTool(file: File): Promise<Tool> {
    const zip = await JSZip.loadAsync(file);
    const files: Record<string, Blob> = {};
    const toolId = `tool_${Date.now()}`;
    let hasEntryPoint = false;

    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        const promise = zipEntry.async('blob').then(blob => {
          files[relativePath] = blob;
          if (relativePath === 'index.html') {
            hasEntryPoint = true;
          }
        });
        filePromises.push(promise);
      }
    });

    await Promise.all(filePromises);

    if (!hasEntryPoint) {
      throw new Error('ZIP ফাইলে index.html খুঁজে পাওয়া যায়নি। এটি রুটে (root) থাকতে হবে।');
    }

    const tool: Tool = {
      id: toolId,
      name: file.name.replace(/\.[^/.]+$/, ""),
      entryPoint: 'index.html',
      files,
      createdAt: Date.now(),
      isFavorite: false
    };

    await this.storage.setItem(tool.id, tool);
    return tool;
  }

  static async getTools(): Promise<Tool[]> {
    const tools: Tool[] = [];
    await this.storage.iterate((value: Tool) => {
      tools.push(value);
    });
    return tools;
  }

  static async deleteTool(id: string): Promise<void> {
    await this.storage.removeItem(id);
  }

  static async toggleFavorite(id: string): Promise<void> {
    const tool = await this.storage.getItem<Tool>(id);
    if (tool) {
      tool.isFavorite = !tool.isFavorite;
      await this.storage.setItem(id, tool);
    }
  }
}
