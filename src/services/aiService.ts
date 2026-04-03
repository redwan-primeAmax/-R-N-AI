/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataManager } from '../utils/DataManager';

export const AIService = {
  async suggestTitles(content: string, retries = 3): Promise<string[]> {
    const settings = await DataManager.getAISettings();
    const selectedProvider = settings.selectedProvider || 'picoapps';
    const selectedModels = settings.selectedModels || { chatgpt: 'gpt-4o', claude: 'claude-3-5-sonnet-20241022', gemini: 'gemini-3-flash-preview' };
    const apiKeys = settings.apiKeys || {};
    const prompt = `Based on the following note content, suggest 10 creative and relevant titles. 
              RULES:
              - Return ONLY a JSON array of strings.
              - DO NOT use colons (:) in the titles.
              - Titles should be direct and clean (e.g., "A Letter to My Friend" instead of "Wishing You Well: A Letter").
              
              Content: ${content.substring(0, 2000)}`;

    const callAI = async (currentPrompt: string, remainingRetries: number): Promise<string> => {
      if (selectedProvider === 'picoapps') {
        return new Promise((resolve, reject) => {
          const websocket = new WebSocket('wss://backend.buildpicoapps.com/ask_ai_streaming_v2');
          let fullResponse = "";

          websocket.addEventListener("open", () => {
            websocket.send(JSON.stringify({ appId: "appear-major", prompt: currentPrompt }));
          });

          websocket.addEventListener("message", (event) => {
            fullResponse += event.data;
          });

          websocket.addEventListener("close", (event) => {
            if (event.code !== 1000) {
              if (remainingRetries > 0) {
                setTimeout(() => resolve(callAI(currentPrompt, remainingRetries - 1)), 1000);
              } else {
                reject(new Error(`AIService WebSocket closed unexpectedly (code: ${event.code})`));
              }
            } else {
              resolve(fullResponse);
            }
          });

          websocket.addEventListener("error", (err) => {
            if (remainingRetries > 0) {
              setTimeout(() => resolve(callAI(currentPrompt, remainingRetries - 1)), 1000);
            } else {
              reject(err);
            }
          });
        });
      } else if (selectedProvider === 'chatgpt') {
        const apiKey = apiKeys.chatgpt;
        if (!apiKey) throw new Error("ChatGPT API Key missing");
        const model = selectedModels.chatgpt;
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: currentPrompt }]
          })
        });
        if (!response.ok) throw new Error("ChatGPT API Error");
        const data = await response.json();
        return data.choices[0].message.content;
      } else if (selectedProvider === 'claude') {
        const apiKey = apiKeys.claude;
        if (!apiKey) throw new Error("Claude API Key missing");
        const model = selectedModels.claude;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 1024,
            messages: [{ role: 'user', content: currentPrompt }]
          })
        });
        if (!response.ok) throw new Error("Claude API Error");
        const data = await response.json();
        return data.content[0].text;
      } else if (selectedProvider === 'gemini') {
        const apiKey = apiKeys.gemini;
        if (!apiKey) throw new Error("Gemini API Key missing");
        const model = selectedModels.gemini;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: currentPrompt }] }]
          })
        });
        if (!response.ok) throw new Error("Gemini API Error");
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
      }
      return "";
    };

    try {
      const fullResponse = await callAI(prompt, retries);
      // Try to extract JSON array from the response
      const match = fullResponse.match(/\[.*\]/s);
      if (match) {
        const titles = JSON.parse(match[0]);
        return titles.slice(0, 10);
      } else {
        // Fallback: split by lines if JSON parsing fails
        const lines = fullResponse.split('\n')
          .map(l => l.replace(/^\d+\.\s*/, '').trim())
          .filter(l => l.length > 0);
        return lines.slice(0, 10);
      }
    } catch (e) {
      console.error("AIService Error:", e);
      return [];
    }
  }
};
