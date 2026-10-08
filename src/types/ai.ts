export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  commandStatus?: 'executing' | 'executed';
  attachedNotes?: { id: string; title: string; emoji?: string; content?: string }[];
  debugInfo?: {
    fullPrompt: string;
    systemPrompt: string;
    mentionedPages?: { id: string; title: string; content: string }[];
  };
}

export interface AITask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  parts: {
    id: string;
    title: string;
    status: 'pending' | 'completed';
    result?: string;
  }[];
  createdAt: number;
  updatedAt: number;
}

export interface ContextSummary {
  text: string;
  timestamp: number;
}

export interface AISettings {
  selectedProvider: 'gemini' | 'openrouter' | 'fireworks' | 'local';
  selectedModels: {
    gemini: string;
    openrouter: string;
    fireworks: string;
    local: string;
  };
  apiKeys: {
    gemini?: string;
    openrouter?: string;
    fireworks?: string;
  };
  enabledProviders: string[];
  dataCheckingEnabled: boolean;
  dataCheckingModel: 'selected' | 'free' | 'custom';
  dataCheckingCustomProvider?: 'gemini' | 'openrouter' | 'fireworks';
  retrySettings: {
    enabled: boolean;
    errorCodes: string;
  };
  selectedAppID?: string;
  customAppIDs?: { id: string; name: string }[];
  providerModels: {
    gemini: string[];
    openrouter: string[];
    fireworks: string[];
    local: string[];
  };
  systemPrompt?: string;
}
