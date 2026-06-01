/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIService } from './AIService';
import { GeminiService } from './gemini/gemini';
import { FireworksService } from './fireworks/fireworks';
import { OpenRouterService } from './openrouter/openrouter';
import { PicoService } from './pico/pico';
import { LocalHandler } from './local/localHandler';

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
