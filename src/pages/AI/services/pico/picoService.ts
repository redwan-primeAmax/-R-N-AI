/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIService, AIServiceOptions } from '../aiService';

export class PicoService extends AIService {
  name = 'picoapps';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { onToken } = options;
    
    return new Promise<string>((resolve, reject) => {
      const attempt = (remainingRetries: number) => {
        const websocket = new WebSocket('wss://backend.buildpicoapps.com/ask_ai_streaming_v2');
        let fullResponse = "";

        websocket.addEventListener("open", () => {
          websocket.send(JSON.stringify({ 
            appId: "threat-all",
            prompt: prompt 
          }));
        });

        websocket.addEventListener("message", (event) => {
          fullResponse += event.data;
          if (onToken) onToken(fullResponse);
        });

        const connectionTimeout = setTimeout(() => {
          if (websocket.readyState !== WebSocket.OPEN) {
            websocket.close();
            if (remainingRetries > 0) {
              console.warn(`WebSocket timeout, retrying... (${remainingRetries} left)`);
              attempt(remainingRetries - 1);
            } else {
              reject(new Error("Connection timeout after multiple attempts"));
            }
          }
        }, 20000);

        websocket.addEventListener("close", (event) => {
          clearTimeout(connectionTimeout);
          if (event.code !== 1000) {
            if (remainingRetries > 0) {
              console.warn(`WebSocket closed unexpectedly (code: ${event.code}), retrying... (${remainingRetries} left)`);
              setTimeout(() => attempt(remainingRetries - 1), 1000);
            } else {
              reject(new Error(`WebSocket closed unexpectedly (code: ${event.code})`));
            }
          } else {
            resolve(fullResponse);
          }
        });

        websocket.addEventListener("error", () => {
          if (remainingRetries > 0) {
            console.warn(`WebSocket error, retrying... (${remainingRetries} left)`);
            setTimeout(() => attempt(remainingRetries - 1), 1000);
          } else {
            reject(new Error("WebSocket error"));
          }
        });
      };

      attempt(3);
    });
  }
}
