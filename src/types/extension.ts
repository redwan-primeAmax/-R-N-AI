
export type ExtensionType = 'theme' | 'tool' | 'widget';

export interface AppAPI {
  // Theme management
  setThemeVariable: (name: string, value: string) => void;
  resetThemeVariables: () => void;
  
  // UI Slots
  registerSidebarItem: (item: SidebarExtensionItem) => void;
  
  // Storage
  getStorage: () => any; // DataManager access
  
  // Notifications
  notify: (message: string, type?: 'info' | 'error' | 'success') => void;
}

export interface SidebarExtensionItem {
  id: string;
  label: string;
  icon: string; // Lucide icon name or SVG
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
  
  // Lifecycle
  init: (api: AppAPI) => void;
  destroy: () => void;
}
