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
    
    // Find all files that are index.html (case-insensitive)
    const entries = Object.keys(zip.files).filter(key => !zip.files[key].dir);
    const indexEntries = entries.filter(key => key.toLowerCase().endsWith('index.html'));
    
    if (indexEntries.length === 0) {
      throw new Error('ZIP ফাইলে কোনো index.html খুঁজে পাওয়া যায়নি।');
    }
    
    // Use the index.html closest to the root (fewest path segments) as the true entry point
    indexEntries.sort((a, b) => a.split('/').length - b.split('/').length);
    const bestIndexKey = indexEntries[0];
    
    // Determine the directory prefix to strip
    let prefixToStrip = '';
    const lastSlashIdx = bestIndexKey.lastIndexOf('/');
    if (lastSlashIdx !== -1) {
      prefixToStrip = bestIndexKey.substring(0, lastSlashIdx + 1); // e.g. "my-project-root/"
    }
    
    const filePromises: Promise<void>[] = [];
    
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        // Only extract files belonging to the tree of the chosen index.html
        if (relativePath.startsWith(prefixToStrip)) {
          const cleanPath = relativePath.slice(prefixToStrip.length);
          if (!cleanPath) return; // skip empty paths
          
          const promise = zipEntry.async('blob').then(blob => {
            files[cleanPath] = blob;
          });
          filePromises.push(promise);
        }
      }
    });

    await Promise.all(filePromises);

    if (!files['index.html']) {
      throw new Error('ZIP ফাইলে index.html খুঁজে পাওয়া যায়নি।');
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
