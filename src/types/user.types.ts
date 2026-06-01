export interface UserPreferences {
  reducedMotion: boolean;
  theme: 'dark' | 'light' | 'system';
  defaultPassword?: string;
}

export type ActionType = 
  | 'open' | 'close' | 'save' | 'create' | 'delete' | 'sync_success' 
  | 'sync_fail' | 'sync_progress' | 'template_use' | 'click' 
  | 'settings_change' | 'navigation' | 'recycle' | 'settings' 
  | 'backup' | 'error' | 'offline' | 'sync' | 'system';

export interface UserAction {
  id: string;
  type: ActionType;
  labelEn: string;
  labelBn: string;
  timestamp: number;
  metadata?: any;
}
