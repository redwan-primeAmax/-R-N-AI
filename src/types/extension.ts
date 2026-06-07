
export type ExtensionType = 'theme' | 'tool' | 'widget';

export interface AppAPI {
  id: string; // The extension ID
  
  // UI Methods
  ui: {
    registerTool: (config: any) => void;
    registerTheme: (config: any) => void;
    addMenuItem: (item: any) => void;
    addButton: (btn: any) => void;
    registerSidebarItem: (item: SidebarExtensionItem) => void;
    notify: (message: string, type?: 'info' | 'error' | 'success') => void;
  };

  // Extension System Enhancements
  registerBlock: (type: string, component: React.ComponentType<any>) => void;
  addFilter: (hook: string, callback: (data: any) => any) => void;

  // Theme Methods
  theme: {
    setVariable: (name: string, value: string) => void;
    setVariables: (vars: Record<string, string>) => void;
    injectCSS: (css: string) => void;
    reset: () => void;
  };
  
  // Storage Methods
  storage: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    remove: (key: string) => void;
    clear: () => void;
  };

  // Legacy/Compatibility
  notify: (message: string, type?: 'info' | 'error' | 'success') => void;
  setThemeVariable: (name: string, value: string) => void;
  registerSidebarItem: (item: SidebarExtensionItem) => void;
  getStorage: () => any;
}

export interface SidebarExtensionItem {
  id: string;
  label: string;
  icon: any; 
  path: string;
  color?: string;
  onClick?: () => void;
}

export interface AppExtension {
  id: string;
  name: string;
  version: string;
  type: ExtensionType;
  description?: string;
  author?: string;
  icon?: any;
  
  // Lifecycle
  init: (api: AppAPI) => void;
  destroy: (api: AppAPI) => void;
}
