import { AppExtension, AppAPI, SidebarExtensionItem } from '../types/extension';

class ExtensionManager {
  private extensions: Map<string, AppExtension> = new Map();
  private sidebarItems: SidebarExtensionItem[] = [];
  private themeVariables: Map<string, string> = new Map();
  private listeners: Set<() => void> = new Set();

  private api: AppAPI = {
    setThemeVariable: (name, value) => {
      this.themeVariables.set(name, value);
      this.applyTheme();
    },
    resetThemeVariables: () => {
      this.themeVariables.clear();
      this.applyTheme();
    },
    registerSidebarItem: (item) => {
      if (!this.sidebarItems.find(i => i.id === item.id)) {
        this.sidebarItems.push(item);
        this.notify();
      }
    },
    getStorage: () => {
      // Return DataManager or similar
      return (window as any).DataManager;
    },
    notify: (message, type = 'info') => {
      // This could trigger a global notification system
      const event = new CustomEvent('app-notification', { 
        detail: { message, type } 
      });
      window.dispatchEvent(event);
    }
  };

  private applyTheme() {
    const root = document.documentElement;
    this.themeVariables.forEach((value, name) => {
      root.style.setProperty(name, value);
    });
    this.notify();
  }

  register(extension: AppExtension) {
    if (this.extensions.has(extension.id)) {
        console.warn(`Extension ${extension.id} is already registered.`);
        return;
    }
    
    try {
      extension.init(this.api);
      this.extensions.set(extension.id, extension);
      console.log(`Extension Loaded: ${extension.name} v${extension.version}`);
      this.notify();
    } catch (error) {
      console.error(`Failed to load extension ${extension.id}:`, error);
    }
  }

  unregister(id: string) {
    const extension = this.extensions.get(id);
    if (extension) {
      try {
        extension.destroy();
        this.extensions.delete(id);
        // Cleanup sidebar items from this extension
        this.sidebarItems = this.sidebarItems.filter(item => !item.id.startsWith(id));
        this.notify();
      } catch (error) {
        console.error(`Failed to destroy extension ${id}:`, error);
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
