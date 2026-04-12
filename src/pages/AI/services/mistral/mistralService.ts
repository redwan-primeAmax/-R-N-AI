/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AIService, AIServiceOptions } from '../aiService';
import { Mistral } from '@mistralai/mistralai';

export class MistralService extends AIService {
  name = 'mistral';

  async sendMessage(prompt: string, options: AIServiceOptions): Promise<string> {
    const { settings, systemPrompt, onToken } = options;
    const userApiKey = settings.apiKeys.mistral;
    const platformApiKey = process.env.MISTRAL_API_KEY;
    const apiKey = (userApiKey || platformApiKey)?.trim();

    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      throw new Error("Mistral API Key is missing or invalid. Please add a valid key in AI Settings.");
    }

    const client = new Mistral({
      apiKey: apiKey,
    });

    const agentId = settings.mistralAgentId || 'ag_019d823c7df1703682e6b94ae0d0dc75';

    try {
      console.log("Mistral: Calling agent using chat.complete with ID:", agentId);
      
      // Using the standard chat.complete method which is more robust for agents
      const response = await client.chat.complete({
        model: agentId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      });

      // Extracting the content from the response
      const content = response.choices?.[0]?.message?.content;
      
      if (typeof content !== 'string') {
        throw new Error("Mistral: Received invalid response format from API.");
      }

      if (onToken && content) {
        onToken(content);
      }

      return content;
    } catch (error: any) {
      console.error("Mistral SDK Error Details:", error);
      
      // Specific handling for 401 Unauthorized
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw new Error("Mistral API Key-টি সঠিক নয় (401 Unauthorized)। দয়া করে নিশ্চিত হোন যে আপনার API Key-টি সক্রিয় এবং এই Agent ID ব্যবহারের অনুমতি আছে।");
      }
      
      throw new Error(error.message || "Mistral AI-এর সাথে যোগাযোগ করতে সমস্যা হচ্ছে।");
    }
  }
}
