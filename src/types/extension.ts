
export type ExtensionType = 'theme' | 'tool' | 'widget';

export interface AppAPI {
  id: string; // The extension ID
  
  // UI Methods
  ui: {
    registerTool: (config: any) => void;
    registerTheme: (config: any) => void;
    registerBlock: (type: string, component: React.ComponentType<any>) => void;
    addMenuItem: (item: any) => void;
    addButton: (btn: any) => void;
    registerSidebarItem: (item: SidebarExtensionItem) => void;
    registerApp: (config: {
      id: string;
      title: string;
      icon: string; // SVG content
      Component: React.ComponentType<any>;
    }) => void;
    notify: (message: string, type?: 'info' | 'error' | 'success') => void;
    showModal: (config: { title: string; content: string }) => void;
    editor: {
      registerBlock: (type: string, component: React.ComponentType<any>) => void;
      insertBlock: (type: string) => void;
      getContent?: () => any;
      getCurrentNote: () => Promise<any>;
      applyChanges?: (newContent: any, reason?: string) => string;
    };
  };

  // Editor Methods (Compatibility)
  editor: {
    registerBlock: (type: string, component: React.ComponentType<any>) => void;
    insertBlock: (type: string) => void;
    getContent?: () => any;
    getCurrentNote: () => Promise<any>;
    applyChanges?: (newContent: any, reason?: string) => string;
  };

  // AI Methods
  ai?: {
    generate: (options: any) => Promise<any>;
    chat: (messages: any[]) => Promise<string>;
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

  // System & Metadata Methods [NEW]
  system?: {
    getInstalledStatus: (id: string) => { installed: boolean; version?: string; type?: string };
    getExtensionMetadata: (id: string) => any;
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
  path?: string;
  color?: string;
  onClick?: () => void;
}

export type ExtensionPermission = 'ui' | 'editor' | 'ai' | 'storage' | 'theme' | 'sidebar';

export interface AppExtension {
  id: string;
  name: string;
  version: string;
  type: ExtensionType;
  description?: string;
  author?: string;
  icon?: any;
  permissions?: ExtensionPermission[];
  sandbox?: boolean;
  hubApp?: {
    id: string;
    title: string;
    icon: string;
    Component: React.ComponentType<any>;
  };
  
  // Lifecycle
  init: (api: AppAPI) => void;
  destroy: (api: AppAPI) => void;
  status?: 'loading' | 'loaded' | 'error' | 'unloading';
  error?: string;
  activatedAt?: number;
}
