// 🔴 Critical Recommendation:
// current implementation uses new Function() to evaluate third-party scripts which run with window object access.
// For production-grade public marketplace, it is highly recommended to migrate to an iframe sandbox 
// or Web Worker-based execution architecture to ensure security and isolation.

import { AppExtension, AppAPI, SidebarExtensionItem } from '../types/extension';
import React from 'react';
import JSZip from 'jszip';
import localforage from 'localforage';
import * as LucideIcons from 'lucide-react';

class ExtensionManager {
  private extensions: Map<string, AppExtension & { _script?: string; _isPersistent?: boolean; _html?: string | null; workspaceId?: string }> = new Map();
  private libraryUI: string | null = null;
  private libraryFiles: Map<string, { manifest: any; script: string }> = new Map();
  private sidebarItems: SidebarExtensionItem[] = [];
  private themeVariables: Map<string, string> = new Map();
  private listeners: Set<() => void> = new Set();
  private injectedStyles: Map<string, HTMLStyleElement> = new Map();
  private blockRegistry: Map<string, React.ComponentType<any>> = new Map();
  private persistentBlocks: Set<string> = new Set(); // Track blocks that should persist data
  private registeredTools: any[] = [];
  private pendingChangeRequests: Map<string, { id: string; extensionId: string; content: any; reason: string; timestamp: number }> = new Map();
  private hubApps: Map<string, { id: string; title: string; icon: string; Component: React.ComponentType<any>; extensionId: string }> = new Map();
  private editorThemes: Map<string, any> = new Map();
  private filters: Map<string, Set<(data: any) => any>> = new Map();
  private changeTimeout: any = null;
  private isBatching: boolean = false;

  constructor() {
    (window as any).React = React;
    (window as any).Lucide = LucideIcons;
    this.loadInstalledExtensions();
    this.loadPersistentBlocksState();

    // Listen for workspace changes to reload extensions
    window.addEventListener('workspace-notes-changed', () => {
      this.loadInstalledExtensions().catch(err => {
        console.error('Failed to reload extensions on workspace change:', err);
      });
    });
  }

  private async loadPersistentBlocksState() {
    const saved = await localforage.getItem<string[]>('persistent_block_types');
    if (saved && Array.isArray(saved)) {
      saved.forEach(type => this.persistentBlocks.add(type));
    }
  }

  private async savePersistentBlocksState() {
    await localforage.setItem('persistent_block_types', Array.from(this.persistentBlocks));
  }

  private transformImports(script: string): string {
    let processed = script;
    
    // Process imports matching:
    // import { ... } from '...'
    // import defaultName, { ... } from '...'
    // import * as name from '...'
    // import name from '...'
    processed = processed.replace(
      /import\s+([\s\S]*?)\s+from\s*['"]([^'"]+)['"]\s*;?/g,
      (match, importClause, source) => {
        const sourceLower = source.trim().toLowerCase();
        const cleanClause = importClause.trim().replace(/\s+/g, ' ');
        
        // Match import * as name from '...'
        if (cleanClause.startsWith('* as ')) {
          const name = cleanClause.slice(5).trim();
          if (sourceLower === 'react') {
            return `const ${name} = React;`;
          } else if (sourceLower === 'lucide-react') {
            return `const ${name} = Lucide;`;
          } else {
            return `const ${name} = (window.${source.replace(/[^a-zA-Z0-9]/g, '_')} || {});`;
          }
        }
        
        // Match destructuring e.g. { a, b } or name, { a, b }
        const braceMatch = cleanClause.match(/\{([\s\S]*?)\}/);
        if (braceMatch) {
          const destructures = braceMatch[1].trim();
          let result = '';
          
          const defaultPart = cleanClause.split('{')[0].trim().replace(/,/g, '').trim();
          if (defaultPart && defaultPart !== '*') {
            if (sourceLower === 'react') {
              result += `const ${defaultPart} = React;\n`;
            } else if (sourceLower === 'lucide-react') {
              result += `const ${defaultPart} = Lucide;\n`;
            } else {
              result += `const ${defaultPart} = (window.${source.replace(/[^a-zA-Z0-9]/g, '_')} || {});\n`;
            }
          }
          
          if (sourceLower === 'react') {
            result += `const { ${destructures} } = React;`;
          } else if (sourceLower === 'lucide-react') {
            result += `const { ${destructures} } = Lucide;`;
          } else {
            result += `const { ${destructures} } = (window.${source.replace(/[^a-zA-Z0-9]/g, '_')} || {});`;
          }
          return result;
        }
        
        // Match simple default import e.g. import name from '...'
        const name = cleanClause;
        if (sourceLower === 'react') {
          return `const ${name} = React;`;
        } else if (sourceLower === 'lucide-react') {
          return `const ${name} = Lucide;`;
        } else {
          return `const ${name} = (window.${source.replace(/[^a-zA-Z0-9]/g, '_')} || {});`;
        }
      }
    );

    // Strip side-effect imports like import "style.css";
    processed = processed.replace(/import\s*['"]([^'"]+)['"]\s*;?/g, '// import "$1";');

    return processed;
  }

  private async evaluateExtension(manifest: any, script: string, api: any) {
    // 1. Try ESM dynamic import first
    try {
      const blob = new Blob([script], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const module = await import(/* @vite-ignore */ url);
      URL.revokeObjectURL(url);
      
      const activate = module.default?.activate || module.activate;
      const deactivate = module.default?.deactivate || module.deactivate;
      
      if (typeof activate === 'function') {
        return {
          activate,
          deactivate: typeof deactivate === 'function' ? deactivate : (() => {})
        };
      }
    } catch (e) {
      console.warn(`Dynamic ESM import failed for extension ${manifest.id || manifest.name}, trying CommonJS fallback:`, e);
    }

    // 2. Fallback: CommonJS/Direct Emulation using Function constructor
    try {
      let processed = script;
      
      // Preprocess and transform ESM imports first
      processed = this.transformImports(processed);
      
      // Transform ESM exports into standard assignments to a local "exports" object
      processed = processed.replace(/\bexport\s+async\s+function\s+(\w+)/g, 'exports.$1 = async function $1');
      processed = processed.replace(/\bexport\s+function\s+(\w+)/g, 'exports.$1 = function $1');
      processed = processed.replace(/\bexport\s+const\s+(\w+)\s*=/g, 'exports.$1 =');
      processed = processed.replace(/\bexport\s+let\s+(\w+)\s*=/g, 'exports.$1 =');
      processed = processed.replace(/\bexport\s+var\s+(\w+)\s*=/g, 'exports.$1 =');
      processed = processed.replace(/\bexport\s+default\s+/g, 'exports.default = ');
      
      // Broader export scrubber for other forms like export { a, b }
      processed = processed.replace(/\bexport\s+\{([\s\S]*?)\};?/g, (match, content) => {
        const exports = content.split(',').map(s => s.trim());
        return exports.map(name => `exports.${name} = ${name};`).join('\n');
      });

      // Cleanup remaining export keywords that might cause syntax errors in new Function
      processed = processed.replace(/^\s*export\s+/gm, ''); 
      
      // Handle the case where they are not exported but we want them (optional/hacky)
      // If no exports found, try to find activate/deactivate in the scope
      processed += `\nif (typeof activate !== 'undefined' && !exports.activate) exports.activate = activate;`;
      processed += `\nif (typeof deactivate !== 'undefined' && !exports.deactivate) exports.deactivate = deactivate;`;
      
      const exports: any = {};
      const moduleObj = { exports };
      
      const runner = new Function('React', 'api', 'exports', 'module', 'Lucide', 'lucide', processed);
      console.log(`Evaluating extension script for ${manifest.id}...`);
      runner(React, api, exports, moduleObj, LucideIcons, LucideIcons);
      console.log(`Evaluation complete for ${manifest.id}. Exports found:`, Object.keys(exports));
      
      const activate = exports.activate || exports.default?.activate || exports.default;
      const deactivate = exports.deactivate || exports.default?.deactivate;
      
      return {
        activate: typeof activate === 'function' ? activate : (() => {}),
        deactivate: typeof deactivate === 'function' ? deactivate : (() => {})
      };
    } catch (err) {
      console.error(`Evaluation failure for extension ${manifest.id || manifest.name}:`, err);
      throw err;
    }
  }

  private async loadInstalledExtensions() {
    this.isBatching = true;
    
    // Clear all currently registered extensions before loading new ones
    for (const extId of Array.from(this.extensions.keys())) {
      this.unregister(extId);
    }
    this.extensions.clear();

    try {
      const activeWorkspaceId = await localforage.getItem<string>('active_workspace_id') || 'default';
      const installed = await localforage.getItem<any[]>('installed_extensions');
      
      if (installed && Array.isArray(installed)) {
        for (const extData of installed) {
          try {
            const manifest = extData.manifest || extData;
            
            // Workspace isolation check: Skip if extension belongs to another workspace
            if (extData.workspaceId && extData.workspaceId !== activeWorkspaceId) {
              continue;
            }
            
            const extension: AppExtension & { _script?: string; _isPersistent?: boolean; workspaceId?: string } = {
              ...manifest,
              _script: extData.script,
              _isPersistent: true,
              workspaceId: extData.workspaceId,
              init: () => {},
              destroy: () => {}
            };
            
            // Set in map before evaluation so createAPI can see permissions
            this.extensions.set(extension.id, extension);
            
            const api = this.createAPI(manifest.id);
            const { activate, deactivate } = await this.evaluateExtension(manifest, extData.script, api);
            
            extension.init = activate;
            extension.destroy = deactivate;
            
            this.register(extension);
          } catch (e) {
            console.error(`Failed to reload extension ${extData.manifest?.id || extData.id}:`, e);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load extensions from storage:', e);
    } finally {
      this.isBatching = false;
      this.emitChange();
    }
  }

  // Create an API instance for a specific extension
  private createAPI(extensionId: string): AppAPI {
    const self = this;
    const extension = this.extensions.get(extensionId);
    const permissions = extension?.permissions || [];
    const isSystem = extensionId === 'system';

    const hasPermission = (perm: string) => isSystem || permissions.includes(perm as any);
    
    return {
      id: extensionId,
      
      // AI Proxy API [NEW]
      ai: {
        generate: async (options: { prompt: string; systemInstruction?: string }) => {
          if (!hasPermission('ai')) {
            return { error: 'PERMISSION_DENIED', message: 'Extension lacks "ai" permission.' };
          }
          const config = await localforage.getItem('ai_config');
          if (!config) {
            return { error: 'AI_NOT_CONFIGURED', message: 'User has not configured AI settings.' };
          }
          
          try {
            const response = await fetch('/api/ai/proxy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...options, extensionId })
            });
            return await response.json();
          } catch (e) {
            return { error: 'AI_SERVICE_UNAVAILABLE' };
          }
        },
        chat: async (messages: any[]) => {
          if (!hasPermission('ai')) {
            throw new Error('Extension lacks "ai" permission.');
          }
          
          try {
            const response = await fetch('/api/ai/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages, extensionId })
            });
            const data = await response.json();
            return data.content || data.text || '';
          } catch (e) {
            console.error('AI Chat Error:', e);
            throw e;
          }
        }
      },

      // Editor & Compatibility Module [NEW]
      editor: {
        registerBlock: (type: string, component: React.ComponentType<any>) => {
          if (!hasPermission('editor')) return;
          this.createAPI(extensionId).registerBlock(type, component);
        },
        insertBlock: (type: string) => {
          if (!hasPermission('editor')) return;
          window.dispatchEvent(new CustomEvent('editor-command', { 
            detail: { command: 'insertBlock', args: [type] } 
          }));
        },
        getContent: () => {
          if (!hasPermission('editor')) return null;
          return (window as any)._currentNoteState || null;
        },
        getCurrentNote: async () => {
          if (!hasPermission('editor')) return null;
          // Dynamically get current note state
          return (window as any)._currentNoteState || null;
        },
        applyChanges: (newContent: any, reason: string = 'Update note content') => {
          if (!hasPermission('editor')) return 'PERMISSION_DENIED';
          const requestId = Math.random().toString(36).substring(7);
          self['pendingChangeRequests'].set(requestId, {
            id: requestId,
            extensionId,
            content: newContent,
            reason,
            timestamp: Date.now()
          });
          self['emitChange']();
          return requestId;
        }
      },

      // UI Module
      ui: {
        showModal: (config: { title: string; content: string }) => {
          window.dispatchEvent(new CustomEvent('app-notification', { 
            detail: { 
              message: config.content, 
              type: 'info',
              title: config.title,
              isModal: true
            } 
          }));
        },
        registerTool: (config: any) => {
          if (!hasPermission('ui')) return;
          if (config.Component) {
            this.blockRegistry.set(config.id, config.Component);
            this.persistentBlocks.add(config.id);
            this.savePersistentBlocksState();
          }
          
          // Deduplicate tools by ID
          const existingIdx = this.registeredTools.findIndex(t => t.id === config.id);
          if (existingIdx > -1) {
            this.registeredTools[existingIdx] = { ...this.registeredTools[existingIdx], ...config, extensionId };
          } else {
            this.registeredTools.push({ ...config, extensionId });
          }
          
          // Compatibility with older systems
          if (config.Component) {
            (window as any).__tools = (window as any).__tools || {};
            (window as any).__tools[config.id] = config.Component;
          }
          this.emitChange();
        },
        registerBlock: (type: string, component: React.ComponentType<any>) => {
          if (!hasPermission('editor')) return;
          this.createAPI(extensionId).registerBlock(type, component);
        },
        registerTheme: (config: any) => {
          if (!hasPermission('theme')) return;
          this.editorThemes.set(config.id, { ...config, extensionId });
          this.emitChange();
        },
        addMenuItem: (item: any) => {
          if (!hasPermission('sidebar')) return;
          this.createAPI(extensionId).ui.registerSidebarItem({
            id: `${extensionId}_${item.id || Math.random().toString(36).substr(2, 9)}`,
            label: item.label,
            icon: item.icon,
            onClick: item.onClick
          } as any);
        },
        addButton: (btn: any) => {
          if (!hasPermission('ui')) return;
          // Compatibility: many extensions expect a toolbar button
          console.log(`Extension ${extensionId} requested toolbar button:`, btn.label);
          // Store for UI to render if needed
          (window as any).__toolbarButtons = (window as any).__toolbarButtons || [];
          (window as any).__toolbarButtons.push({ ...btn, extensionId });
        },
        registerSidebarItem: (item: SidebarExtensionItem) => {
          if (!hasPermission('sidebar')) return;
          const existingIdx = this.sidebarItems.findIndex(i => i.id === item.id || i.id === `${extensionId}_${item.id}`);
          const newItem = {
            ...item,
            id: item.id.startsWith(extensionId) ? item.id : `${extensionId}_${item.id}`
          };
          
          if (existingIdx > -1) {
            this.sidebarItems[existingIdx] = newItem;
          } else {
            this.sidebarItems.push(newItem);
          }
          this.emitChange();
        },
        registerApp: (config: { id: string; title: string; icon: string; Component: React.ComponentType<any> }) => {
          if (!hasPermission('ui')) return;
          this.hubApps.set(`${extensionId}_${config.id}`, { ...config, extensionId });
          this.emitChange();
        },
        notify: (message, type = 'info') => {
          window.dispatchEvent(new CustomEvent('app-notification', { detail: { message, type } }));
        },
        editor: {
          registerBlock: (type: string, component: React.ComponentType<any>) => {
            if (!hasPermission('editor')) return;
            this.registerBlock(type, component);
          },
          insertBlock: (type: string) => {
            if (!hasPermission('editor')) return;
            window.dispatchEvent(new CustomEvent('editor-command', { 
              detail: { command: 'insertBlock', args: [type] } 
            }));
          },
          getContent: () => {
            if (!hasPermission('editor')) return null;
            return (window as any)._currentNoteState || null;
          },
          getCurrentNote: async () => {
            if (!hasPermission('editor')) return null;
            return (window as any)._currentNoteState || null;
          },
          applyChanges: (newContent: any, reason: string = 'Update note content') => {
            if (!hasPermission('editor')) return 'PERMISSION_DENIED';
            return this.applyChanges(newContent, reason);
          }
        }
      },

      registerBlock: (type, component) => {
        if (!hasPermission('editor')) return;
        this.blockRegistry.set(type, component);
        this.persistentBlocks.add(type);
        this.savePersistentBlocksState();
        
        // Auto-register as a tool if not already present in registeredTools
        const existingTool = this.registeredTools.find(t => t.id === type);
        if (!existingTool) {
          this.registeredTools.push({
            id: type,
            label: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            icon: '📦',
            description: 'Custom extension block',
            extensionId,
            Component: component
          });
        } else if (!existingTool.Component) {
          existingTool.Component = component;
        }
        
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
          if (!hasPermission('theme')) return;
          this.themeVariables.set(name, value);
          this.applyTheme();
        },
        setVariables: (vars) => {
          if (!hasPermission('theme')) return;
          Object.entries(vars).forEach(([name, value]) => this.themeVariables.set(name, value));
          this.applyTheme();
        },
        injectCSS: (cssText) => {
          if (!hasPermission('theme')) return;
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
          if (!hasPermission('theme')) return;
          this.themeVariables.clear();
          this.removeStyle(extensionId);
          this.applyTheme();
        }
      },

      // Storage Module
      storage: {
        get: (key) => {
          if (!hasPermission('storage')) return null;
          const val = localStorage.getItem(`ext_${extensionId}_${key}`);
          try { return val ? JSON.parse(val) : null; } catch { return val; }
        },
        set: (key, value) => {
          if (!hasPermission('storage')) return;
          localStorage.setItem(`ext_${extensionId}_${key}`, JSON.stringify(value));
        },
        remove: (key) => {
          if (!hasPermission('storage')) return;
          localStorage.removeItem(`ext_${extensionId}_${key}`);
        },
        clear: () => {
          if (!hasPermission('storage')) return;
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
      
      // Cleanup hub apps
      for (const [key, value] of this.hubApps.entries()) {
        if (value.extensionId === id) {
          this.hubApps.delete(key);
        }
      }

      if ((window as any).__toolbarButtons) {
        (window as any).__toolbarButtons = (window as any).__toolbarButtons.filter((b: any) => 
          b.extensionId !== id && !b.id?.toLowerCase().includes(id.toLowerCase())
        );
      }

      // Cleanup tool metadata
      this.registeredTools = this.registeredTools.filter(t => t.extensionId !== id);

      // IMPORTANT: STICKY BLOCKS
      // We do NOT remove entries from persistentBlocks here.
      // We only remove from the ACTIVE registry.
      for (const [key] of this.blockRegistry.entries()) {
        if (key.toLowerCase().includes(id.toLowerCase()) || key === id) {
          this.blockRegistry.delete(key);
        }
      }

      // Cleanup themes
      for (const [key, value] of this.editorThemes.entries()) {
        if (value.extensionId === id || key.toLowerCase().includes(id.toLowerCase())) {
          this.editorThemes.delete(key);
        }
      }

      // 4. Persistence Purge
      await this.persistExtensions();

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

  async loadExtensionFromZip(file: File | Blob, persist: boolean = false) {
    console.log('Loading extension from zip...', { size: file.size, type: file.type, persist });
    try {
      const zip = new JSZip();
      
      // Explicitly check if file is empty
      if (file.size === 0) {
        throw new Error('ZIP file is empty (0 bytes)');
      }

      const content = await zip.loadAsync(file);
      console.log('Zip loaded successfully, files:', Object.keys(content.files));
      
      const manifestFile = content.file('manifest.json');
      const indexFile = content.file('index.js');
      const htmlFile = content.file('index.html');
      
      if (!manifestFile || !indexFile) {
        throw new Error('ZIP must contain manifest.json and index.js');
      }
      
      const manifestText = await manifestFile.async('text');
      const manifest = JSON.parse(manifestText);
      const script = await indexFile.async('text');
      const html = htmlFile ? await htmlFile.async('text') : null;
      
      console.log('Extracted manifest:', manifest.id, manifest.name);
      
      // Basic validation
      if (!manifest.id || !manifest.name || !manifest.version) {
        throw new Error('Invalid manifest.json: missing id, name or version');
      }

      const extension: AppExtension & { _script?: string; _isPersistent?: boolean; _html?: string | null; workspaceId?: string } = {
        ...manifest,
        permissions: manifest.permissions || [],
        sandbox: !!manifest.sandbox,
        workspaceId: (window as any)._activeWorkspaceId || 'default',
        _script: script,
        _html: html,
        _isPersistent: persist,
        init: () => {},
        destroy: () => {}
      };
      
      this.extensions.set(manifest.id, extension);

      const api = this.createAPI(manifest.id);
      const { activate, deactivate } = await this.evaluateExtension(manifest, script, api);
      
      extension.init = activate;
      extension.destroy = deactivate;
      
      this.register(extension);
      
      if (persist) {
        await this.persistExtensions();
      }
      
      return manifest;
    } catch (err: any) {
      console.error('Failed to load extension zip:', err);
      throw new Error(`Failed to load extension zip: ${err.message}`);
    }
  }

  private async persistExtensions() {
    const data = Array.from(this.extensions.entries())
      .filter(([_, ext]) => (ext as any)._isPersistent)
      .map(([id, ext]) => ({
      id,
      workspaceId: (ext as any).workspaceId,
      manifest: {
        id: ext.id,
        name: ext.name,
        version: ext.version,
        type: ext.type,
        description: ext.description,
        author: ext.author,
        permissions: ext.permissions,
        sandbox: ext.sandbox
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
    
    // Create temporary extension entry to allow createAPI to see permissions
    const extension: AppExtension & { _script?: string; _isPersistent?: boolean; workspaceId?: string } = {
      ...manifest,
      permissions: manifest.permissions || [],
      sandbox: !!manifest.sandbox,
      workspaceId: (window as any)._activeWorkspaceId || 'default',
      _script: script,
      _isPersistent: true,
      init: () => {},
      destroy: () => {}
    };
    
    this.extensions.set(manifest.id, extension);
    
    const api = this.createAPI(manifest.id);
    const { activate, deactivate } = await this.evaluateExtension(manifest, script, api);

    extension.init = activate;
    extension.destroy = deactivate;

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
    
    // Safety Layer: Deep clone if it is a complex object to prevent state-corruption in the main engine
    let result = (data && typeof data === 'object') ? JSON.parse(JSON.stringify(data)) : data;
    const initialState = JSON.stringify(result);
    
    callbacks.forEach(cb => {
      try {
        const filtered = cb(result);
        // Validation: If filter returns null or undefined, ignore it to prevent crash
        if (filtered !== null && filtered !== undefined) {
          result = filtered;
        }
      } catch (e) {
        console.error(`Filter Error in hook ${hook}:`, e);
      }
    });

    // Verification: If the resulting object is broken or wiped maliciously, rollback to initial state
    if (typeof data === 'object' && result === undefined) {
      console.warn(`Filter [${hook}] returned undefined. Rolling back to safe state.`);
      return JSON.parse(initialState);
    }

    return result;
  }

  getBlockComponent(type: string): React.ComponentType<any> | null {
    return this.blockRegistry.get(type) || null;
  }

  // Check if a block type was known to the system even if not currently active
  isPersistentBlock(type: string): boolean {
    return this.persistentBlocks.has(type);
  }

  getRegisteredTools() {
    return this.registeredTools;
  }

  getPendingChangeRequests() {
    return Array.from(this.pendingChangeRequests.values());
  }

  resolveChangeRequest(requestId: string, approved: boolean) {
    const request = this.pendingChangeRequests.get(requestId);
    if (request && approved) {
      const event = new CustomEvent('extension-apply-changes', { detail: request });
      window.dispatchEvent(event);
    }
    this.pendingChangeRequests.delete(requestId);
    this.emitChange();
  }

  getRegisteredThemes() {
    return Array.from(this.editorThemes.values());
  }

  getThemeConfig(id: string) {
    return this.editorThemes.get(id);
  }

  getSidebarItems() {
    return [...this.sidebarItems];
  }

  getHubApps() {
    return Array.from(this.hubApps.values());
  }

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emitChange() {
    if (this.isBatching) return;
    
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }
    
    this.changeTimeout = setTimeout(() => {
      this.listeners.forEach(l => l());
      this.changeTimeout = null;
    }, 16); // Buffer for 1 frame approx
  }
}

export const extensionManager = new ExtensionManager();
