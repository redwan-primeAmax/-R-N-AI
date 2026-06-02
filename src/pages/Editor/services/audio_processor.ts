/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioProcessor {
  private static synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;

  static async generateAudioFromText(
    text: string, 
    onStart: () => void,
    onEnd: () => void,
    onError: (err: any) => void,
    options: { rate?: number; pitch?: number; voiceIndex?: number } = {}
  ): Promise<void> {
    if (!this.synthesis) {
      onError(new Error('Speech synthesis not supported in this browser.'));
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
    } else if (voices.length > 0) {
      // Default to first English voice if available
      const enVoice = voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onstart = () => {
      onStart();
    };

    utterance.onend = () => {
      onEnd();
    };

    utterance.onerror = (event) => {
      onError(event);
    };

    this.synthesis.speak(utterance);
  }

  static pause() {
    if (this.synthesis) {
      this.synthesis.pause();
    }
  }

  static resume() {
    if (this.synthesis) {
      this.synthesis.resume();
    }
  }

  static stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  static getVoices() {
    return this.synthesis ? this.synthesis.getVoices() : [];
  }

  static isSpeaking() {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  static isPaused() {
    return this.synthesis ? this.synthesis.paused : false;
  }
}
