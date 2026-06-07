import { AppExtension, AppAPI, SidebarExtensionItem } from '../types/extension';
import React from 'react';
import JSZip from 'jszip';
import localforage from 'localforage';

class ExtensionManager {
  private extensions: Map<string, AppExtension & { _script?: string; _isPersistent?: boolean; _html?: string | null }> = new Map();
  private libraryUI: string | null = null;
  private libraryFiles: Map<string, { manifest: any; script: string }> = new Map();
  private sidebarItems: SidebarExtensionItem[] = [];
  private themeVariables: Map<string, string> = new Map();
  private listeners: Set<() => void> = new Set();
  private injectedStyles: Map<string, HTMLStyleElement> = new Map();
  private blockRegistry: Map<string, React.ComponentType<any>> = new Map();
  private filters: Map<string, Set<(data: any) => any>> = new Map();

  constructor() {
    this.loadInstalledExtensions();
  }

  private async loadInstalledExtensions() {
    try {
      const installed = await localforage.getItem<any[]>('installed_extensions');
      if (installed && Array.isArray(installed)) {
        for (const extData of installed) {
          try {
            const blob = new Blob([extData.script], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            const module = await import(/* @vite-ignore */ url);
            
            const extension: AppExtension & { _script?: string; _isPersistent?: boolean } = {
              ...extData.manifest,
              _script: extData.script,
              _isPersistent: true,
              init: module.default?.activate || module.activate || (() => {}),
              destroy: module.default?.deactivate || module.deactivate || (() => {})
            };
            
            this.register(extension);
          } catch (e) {
            console.error(`Failed to reload extension ${extData.manifest?.id}:`, e);
          }
        }
      }
      this.emitChange();
    } catch (e) {
      console.error('Failed to load extensions from storage:', e);
    }
  }

  // Create an API instance for a specific extension
  private createAPI(extensionId: string): AppAPI {
    const self = this;
    
    return {
      id: extensionId,
      
      // UI Module
      ui: {
        registerTool: (config: any) => {
          // Compatibility with px_to: store tool components in a global registry
          (window as any).__tools = (window as any).__tools || {};
          (window as any).__tools[config.id] = config.Component;
          console.log(`Tool Registered: ${config.id}`);
        },
        addMenuItem: (item: any) => {
          this.createAPI(extensionId).ui.registerSidebarItem({
            id: `${extensionId}_${item.id || Math.random().toString(36).substr(2, 9)}`,
            label: item.label,
            icon: item.icon,
            path: item.path || '#',
            onClick: item.onClick
          });
        },
        addButton: (btn: any) => {
          // Compatibility: many extensions expect a toolbar button
          console.log(`Extension ${extensionId} requested toolbar button:`, btn.label);
          // Store for UI to render if needed
          (window as any).__toolbarButtons = (window as any).__toolbarButtons || [];
          (window as any).__toolbarButtons.push({ ...btn, extensionId });
        },
        registerSidebarItem: (item: SidebarExtensionItem) => {
          if (!this.sidebarItems.find(i => i.id === item.id)) {
            this.sidebarItems.push({
              ...item,
              id: item.id.startsWith(extensionId) ? item.id : `${extensionId}_${item.id}`
            });
            this.emitChange();
          }
        },
        notify: (message, type = 'info') => {
          window.dispatchEvent(new CustomEvent('app-notification', { detail: { message, type } }));
        }
      },

      registerBlock: (type, component) => {
        this.blockRegistry.set(type, component);
        this.emitChange();
      },

      addFilter: (hook, callback) => {
        if (!this.filters.has(hook)) {
          this.filters.set(hook, new Set());
        }
        this.filters.get(hook)!.add(callback);
      },

      // Theme Module
      theme: {
        setVariable: (name, value) => {
          this.themeVariables.set(name, value);
          this.applyTheme();
        },
        setVariables: (vars) => {
          Object.entries(vars).forEach(([name, value]) => this.themeVariables.set(name, value));
          this.applyTheme();
        },
        injectCSS: (cssText) => {
          // Cleanup existing if replacement
          this.removeStyle(extensionId);
          
          const style = document.createElement('style');
          style.id = `ext-style-${extensionId}`;
          style.setAttribute('data-extension-id', extensionId);
          
          // Scoping logic: Prefix classes with [data-extension-id="id"]
          // This ensures extension CSS doesn't leak to the main app
          const scopedCSS = cssText.replace(
            /(\.\w[\w-]*)/g, 
            `[data-extension-id="${extensionId}"] $1`
          );
          
          style.textContent = scopedCSS;
          document.head.appendChild(style);
          this.injectedStyles.set(extensionId, style);
        },
        reset: () => {
          this.themeVariables.clear();
          this.removeStyle(extensionId);
          this.applyTheme();
        }
      },

      // Storage Module
      storage: {
        get: (key) => {
          const val = localStorage.getItem(`ext_${extensionId}_${key}`);
          try { return val ? JSON.parse(val) : null; } catch { return val; }
        },
        set: (key, value) => {
          localStorage.setItem(`ext_${extensionId}_${key}`, JSON.stringify(value));
        },
        remove: (key) => localStorage.removeItem(`ext_${extensionId}_${key}`),
        clear: () => {
          const prefix = `ext_${extensionId}_`;
          Object.keys(localStorage)
            .filter(k => k.startsWith(prefix))
            .forEach(k => localStorage.removeItem(k));
        }
      },

      // Legacy Compatibility
      notify: (message: string, type: 'info' | 'error' | 'success' = 'info') => {
        window.dispatchEvent(new CustomEvent('app-notification', { detail: { message, type } }));
      },
      setThemeVariable: (name, value) => this.themeVariables.set(name, value),
      getStorage: () => (window as any).DataManager,
      registerSidebarItem: (item) => this.api.ui.registerSidebarItem(item)
    };
  }

  // The global default API (legacy)
  private get api(): AppAPI {
    return this.createAPI('system');
  }

  private applyTheme() {
    const root = document.documentElement;
    this.themeVariables.forEach((value, name) => {
      root.style.setProperty(name, value);
    });
    this.emitChange();
  }

  private removeStyle(id: string) {
    const existing = this.injectedStyles.get(id);
    if (existing) {
      existing.remove();
      this.injectedStyles.delete(id);
    }
    // Double check search by attribute
    document.querySelectorAll(`style[data-extension-id="${id}"]`).forEach(el => el.remove());
  }

  private _checkVersion(version: string): boolean {
    const MIN_API = '1.0';
    const ext = version.split('.').map(Number);
    const min = MIN_API.split('.').map(Number);
    for (let i = 0; i < Math.max(ext.length, min.length); i++) {
      if ((ext[i] || 0) > (min[i] || 0)) return true;
      if ((ext[i] || 0) < (min[i] || 0)) return false;
    }
    return true;
  }

  register(extension: AppExtension & { _script?: string; _isPersistent?: boolean }) {
    // Conflict resolution: latest wins
    if (this.extensions.has(extension.id)) {
      this.unregister(extension.id);
    }

    // Version check
    if (!this._checkVersion(extension.version)) {
      console.warn(`Extension ${extension.id} v${extension.version} is incompatible with this version of the app.`);
      return;
    }
    
    try {
      this.extensions.set(extension.id, extension);
      
      // Async initialization for performance and to ensure DOM readiness
      setTimeout(() => {
        try {
          extension.init(this.createAPI(extension.id));
          console.log(`Extension Loaded: ${extension.name} v${extension.version} (Persistent: ${!!extension._isPersistent})`);
          this.emitChange();
        } catch (initError) {
          console.error(`Init Error [${extension.id}]:`, initError);
        }
      }, 0);
      
    } catch (error) {
      console.error(`Registration Error [${extension.id}]:`, error);
    }
  }

  async unregister(id: string) {
    console.log(`Attempting to unregister/purge extension: ${id}`);
    
    // 1. Memory cleanup (even if get() fails, we try to delete)
    const extension = this.extensions.get(id);
    this.extensions.delete(id);
    
    try {
      // 2. Perform destroy if extension exists
      if (extension && extension.destroy) {
        try {
          extension.destroy(this.createAPI(id));
        } catch (e) {
          console.error(`Deactivate error for ${id}:`, e);
        }
      }

      // 3. Cleanup UI registries
      this.sidebarItems = this.sidebarItems.filter(item => 
        !item.id.toLowerCase().includes(id.toLowerCase())
      );
      
      this.removeStyle(id);

      if ((window as any).__toolbarButtons) {
        (window as any).__toolbarButtons = (window as any).__toolbarButtons.filter((b: any) => 
          b.extensionId !== id && !b.id?.toLowerCase().includes(id.toLowerCase())
        );
      }

      // Cleanup block registry
      for (const [key] of this.blockRegistry.entries()) {
        if (key.toLowerCase().includes(id.toLowerCase())) {
          this.blockRegistry.delete(key);
        }
      }

      // 4. Persistence Purge
      // First, update persistExtensions (this will omit the deleted one from the next save)
      await this.persistExtensions();

      // Explicitly check and remove from localforage if for some reason persistExtensions fails to clean it up
      // (e.g. if we want to be paranoid)
      const installed = await localforage.getItem<any[]>('installed_extensions');
      if (installed && Array.isArray(installed)) {
        const filtered = installed.filter(item => 
          item.id !== id && 
          item.manifest?.id !== id &&
          item.id?.toLowerCase() !== id.toLowerCase()
        );
        if (filtered.length !== installed.length) {
          await localforage.setItem('installed_extensions', filtered);
          console.log(`Explicitly purged ${id} from persistent storage.`);
        }
      }

      // 5. App-level cleanup
      const storagePrefix = `ext_${id}_`;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(storagePrefix)) localStorage.removeItem(key);
      });

      // 6. State update and reload
      this.emitChange();
      window.dispatchEvent(new CustomEvent('extension-system-reload', { detail: { uninstalled: id } }));
      
      console.log(`Extension ${id} successfully uninstalled.`);
      return true;
    } catch (error) {
      console.error(`Unregister Error [${id}]:`, error);
      return false;
    }
  }

  async loadExtensionFromZip(file: File, persist: boolean = false) {
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      const manifestFile = content.file('manifest.json');
      const indexFile = content.file('index.js');
      const htmlFile = content.file('index.html');
      
      if (!manifestFile || !indexFile) {
        throw new Error('ZIP must contain manifest.json and index.js');
      }
      
      const manifest = JSON.parse(await manifestFile.async('text'));
      const script = await indexFile.async('text');
      const html = htmlFile ? await htmlFile.async('text') : null;
      
      // Basic validation
      if (!manifest.id || !manifest.name || !manifest.version) {
        throw new Error('Invalid manifest.json: missing id, name or version');
      }

      // Load it
      const blob = new Blob([script], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const module = await import(/* @vite-ignore */ url);
      
      const extension: AppExtension & { _script?: string; _isPersistent?: boolean; _html?: string | null } = {
        ...manifest,
        _script: script,
        _html: html,
        _isPersistent: persist,
        init: module.default?.activate || module.activate || (() => {}),
        destroy: module.default?.deactivate || module.deactivate || (() => {})
      };
      
      this.register(extension);
      
      if (persist) {
        await this.persistExtensions();
      }
      
      return manifest;
    } catch (err) {
      console.error('Failed to load extension zip:', err);
      throw err;
    }
  }

  private async persistExtensions() {
    const data = Array.from(this.extensions.entries())
      .filter(([_, ext]) => (ext as any)._isPersistent)
      .map(([id, ext]) => ({
      id,
      manifest: {
        id: ext.id,
        name: ext.name,
        version: ext.version,
        type: ext.type,
        description: ext.description,
        author: ext.author
      },
      script: (ext as any)._script
    })).filter(item => !!item.script);
    
    await localforage.setItem('installed_extensions', data);
  }

  reloadApp() {
    this.emitChange();
  }

  getLibraryUI() { return this.libraryUI; }

  async installFromLibrary(folderName: string) {
    const fileData = this.libraryFiles.get(folderName);
    if (!fileData) throw new Error(`Extension "${folderName}" not found in current library.`);

    const { manifest, script } = fileData;
    const blob = new Blob([script], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const module = await import(/* @vite-ignore */ url);

    const extension: AppExtension & { _script?: string; _isPersistent?: boolean } = {
      ...manifest,
      _script: script,
      _isPersistent: true, // Installed ones are persistent
      init: module.default?.activate || module.activate || (() => {}),
      destroy: module.default?.deactivate || module.deactivate || (() => {})
    };

    this.register(extension);
    await this.persistExtensions();
    return manifest;
  }

  async loadLibraryZip(file: File) {
    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(file);
      
      // 1. Look for root index.html (The Store UI)
      const htmlFile = content.file('index.html');
      if (htmlFile) {
        this.libraryUI = await htmlFile.async('text');
      }

      // 2. Scan extensions/ folder
      this.libraryFiles.clear();
      const extensionsFolder = content.folder('extensions');
      
      if (extensionsFolder) {
        // Find distinct subfolders in extensions/
        const folderNames = new Set<string>();
        Object.keys(content.files).forEach(path => {
          if (path.startsWith('extensions/') && path !== 'extensions/') {
            const relative = path.replace('extensions/', '');
            const folderName = relative.split('/')[0];
            if (folderName) folderNames.add(folderName);
          }
        });

        for (const folder of folderNames) {
          const mFile = content.file(`extensions/${folder}/manifest.json`);
          const iFile = content.file(`extensions/${folder}/index.js`);
          
          if (mFile && iFile) {
            const manifest = JSON.parse(await mFile.async('text'));
            const script = await iFile.async('text');
            this.libraryFiles.set(folder, { manifest, script });
            console.log(`Discovered library extension: ${manifest.name} in folder ${folder}`);
          }
        }
      }

      this.emitChange();
      return { 
        hasUI: !!this.libraryUI, 
        extensionCount: this.libraryFiles.size 
      };
    } catch (err) {
      console.error('Library Zip Error:', err);
      throw err;
    }
  }

  getInstalledExtensions() {
    return Array.from(this.extensions.values());
  }

  applyFilters(hook: string, data: any): any {
    const callbacks = this.filters.get(hook);
    if (!callbacks) return data;
    
    let result = data;
    callbacks.forEach(cb => {
      try {
        result = cb(result);
      } catch (e) {
        console.error(`Filter Error in hook ${hook}:`, e);
      }
    });
    return result;
  }

  getBlockComponent(type: string): React.ComponentType<any> | null {
    return this.blockRegistry.get(type) || null;
  }

  getSidebarItems() {
    return this.sidebarItems;
  }

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitChange() {
    this.listeners.forEach(l => l());
  }
}

export const extensionManager = new ExtensionManager();
