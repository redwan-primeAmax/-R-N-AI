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
      // Find language of the text. If any Bengali characters, find a Bengali voice
      const hasBengali = /[\u0980-\u09FF]/.test(text);
      if (hasBengali) {
        const bnVoice = voices.find(v => v.lang.startsWith('bn'));
        if (bnVoice) {
          utterance.voice = bnVoice;
        } else {
          // fallback to standard male voice
          const maleVoice = voices.find(v => {
            const name = v.name.toLowerCase();
            return name.includes('male') || name.includes('david') || name.includes('mark') || name.includes('george') || name.includes('daniel') || name.includes('guy') || name.includes('sam');
          }) || voices.find(v => v.lang.startsWith('en')) || voices[0];
          utterance.voice = maleVoice;
        }
      } else {
        // Look for male english voice
        const maleEnVoice = voices.find(v => {
          const name = v.name.toLowerCase();
          const lang = v.lang.toLowerCase();
          return lang.startsWith('en') && (
            name.includes('male') || 
            name.includes('david') || 
            name.includes('mark') || 
            name.includes('george') || 
            name.includes('daniel') || 
            name.includes('guy') || 
            name.includes('sam') || 
            name.includes('google us english') || 
            name.includes('microsoft david')
          );
        });
        if (maleEnVoice) {
          utterance.voice = maleEnVoice;
        } else {
          const maleAnyVoice = voices.find(v => {
            const name = v.name.toLowerCase();
            return name.includes('male') || name.includes('david') || name.includes('mark') || name.includes('george') || name.includes('daniel') || name.includes('guy');
          });
          if (maleAnyVoice) {
            utterance.voice = maleAnyVoice;
          } else {
            const enVoice = voices.find(v => v.lang.startsWith('en'));
            if (enVoice) utterance.voice = enVoice;
          }
        }
      }
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
