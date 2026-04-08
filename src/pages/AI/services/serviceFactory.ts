/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PicoService } from './pico/picoService';
import { GeminiService } from './gemini/geminiService';
import { OpenRouterService } from './openrouter/openrouterService';
import { AIService } from './aiService';

export class AIServiceFactory {
  static getService(provider: string): AIService {
    switch (provider) {
      case 'picoapps':
        return new PicoService();
      case 'gemini':
        return new GeminiService();
      case 'openrouter':
        return new OpenRouterService();
      default:
        return new PicoService();
    }
  }
}
