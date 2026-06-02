/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioProcessor {
  private static synthesis = window.speechSynthesis;

  static async generateAudioFromText(text: string, options: { rate?: number; pitch?: number; voiceIndex?: number } = {}): Promise<processResult> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported in this browser.'));
        return;
      }

      // Stop any current speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;

      const voices = this.synthesis.getVoices();
      if (options.voiceIndex !== undefined && voices[options.voiceIndex]) {
        utterance.voice = voices[options.voiceIndex];
      }

      utterance.onend = () => {
        resolve({ status: 'success' });
      };

      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.synthesis.speak(utterance);
    });
  }

  static stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  static getVoices() {
    return this.synthesis ? this.synthesis.getVoices() : [];
  }
}

interface processResult {
  status: 'success' | 'error';
}
