/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SuiterOptions {
  appId: string;
  params?: Record<string, any>;
}

export class SuiterService {
  /**
   * Call a Suiter App by its ID.
   * This is a temporary implementation for App ID call support.
   */
  static async callApp(options: SuiterOptions): Promise<any> {
    const { appId, params = {} } = options;
    
    console.log(`SuiterService: Calling App ID ${appId} with params:`, params);
    
    try {
      // This is a placeholder for the actual Suiter API call.
      // The user mentioned they can provide the specific code if needed.
      const response = await fetch(`https://api.suiter.io/v1/apps/${appId}/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${process.env.SUITER_API_KEY}` // To be added later
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `Suiter API Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("SuiterService Error:", error);
      throw error;
    }
  }
}
