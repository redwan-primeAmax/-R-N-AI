import { AppExtension, AppAPI, SidebarExtensionItem } from '../types/extension';

class ExtensionManager {
  private extensions: Map<string, AppExtension> = new Map();
  private sidebarItems: SidebarExtensionItem[] = [];
  private themeVariables: Map<string, string> = new Map();
  private listeners: Set<() => void> = new Set();
  private injectedStyles: Map<string, HTMLStyleElement> = new Map();

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
          this.api.ui.registerSidebarItem({
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
            this.notify();
          }
        },
        notify: (message, type = 'info') => {
          window.dispatchEvent(new CustomEvent('app-notification', { detail: { message, type } }));
        }
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
    this.notify();
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

  register(extension: AppExtension) {
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
          console.log(`Extension Loaded: ${extension.name} v${extension.version}`);
          this.notify();
        } catch (initError) {
          console.error(`Init Error [${extension.id}]:`, initError);
        }
      }, 0);
      
    } catch (error) {
      console.error(`Registration Error [${extension.id}]:`, error);
    }
  }

  unregister(id: string) {
    const extension = this.extensions.get(id);
    if (extension) {
      try {
        extension.destroy();
        this.extensions.delete(id);
        this.removeStyle(id);
        // Cleanup sidebar items
        this.sidebarItems = this.sidebarItems.filter(item => !item.id.startsWith(id));
        this.notify();
      } catch (error) {
        console.error(`Unregister Error [${id}]:`, error);
      }
    }
  }

  getSidebarItems() {
    return this.sidebarItems;
  }

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const extensionManager = new ExtensionManager();
