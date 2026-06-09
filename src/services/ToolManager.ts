import localforage from 'localforage';
import JSZip from 'jszip';

export interface Tool {
  id: string;
  name: string;
  entryPoint: string; // The URL to index.html (blob URL or similar)
  files: Record<string, string>; // path -> content mapping
}

const TOOL_STORAGE_KEY = 'app_tools_data';

export class ToolManager {
  private static storage = localforage.createInstance({
    name: 'ToolManager',
    storeName: 'tools'
  });

  static async uploadTool(file: File): Promise<Tool> {
    const zip = await JSZip.loadAsync(file);
    const files: Record<string, string> = {};
    const toolId = `tool_${Date.now()}`;
    let entryPointHtml = '';

    const filePromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        const promise = zipEntry.async('string').then(content => {
          files[relativePath] = content;
          if (relativePath.endsWith('index.html')) {
            entryPointHtml = content;
          }
        });
        filePromises.push(promise);
      }
    });

    await Promise.all(filePromises);

    if (!entryPointHtml) {
      throw new Error('ZIP ফাইলে index.html খুঁজে পাওয়া যায়নি।');
    }

    const tool: Tool = {
      id: toolId,
      name: file.name.replace(/\.[^/.]+$/, ""),
      entryPoint: 'index.html',
      files
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

  static generateEntryPointUrl(tool: Tool): string {
    // We need to construct a blob URL for the index.html that can resolve other relative files
    // This is tricky for local files. A better way is to use a service worker or 
    // a base64 encoded URL with modified src/href.
    // However, for testing, we can inject a base tag or rewrite paths.
    
    let html = tool.files['index.html'];
    
    // Simple path rewriting for local CSS/JS if needed
    // For now, let's assume all assets are linked relatively and handled by the runner.
    
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }
}
