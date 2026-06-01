/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIService } from './aiService';
import { GeminiService } from './ai/gemini/gemini';
import { FireworksService } from './ai/fireworks/fireworks';
import { OpenRouterService } from './ai/openrouter/openrouter';
import { PicoService } from './ai/pico/pico';
import { LocalHandler } from './ai/local/localHandler';

export class AIServiceFactory {
  static getService(provider: string): AIService {
    switch (provider) {
      case 'gemini':
        return new GeminiService();
      case 'fireworks':
        return new FireworksService();
      case 'openrouter':
        return new OpenRouterService();
      case 'picoapps':
        return new PicoService();
      case 'local':
        return new LocalHandler();
      default:
        return new PicoService();
    }
  }
}
