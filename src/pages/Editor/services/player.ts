/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
}

export class MediaController {
  private mediaElement: HTMLMediaElement | null = null;
  private onStateChange: (state: PlayerState) => void;

  constructor(element: HTMLMediaElement, onStateChange: (state: PlayerState) => void) {
    this.mediaElement = element;
    this.onStateChange = onStateChange;
    this.setupListeners();
  }

  private setupListeners() {
    if (!this.mediaElement) return;

    const events = ['play', 'pause', 'timeupdate', 'durationchange', 'ratechange', 'volumechange', 'ended'];
    events.forEach(event => {
      this.mediaElement?.addEventListener(event, () => this.updateState());
    });
  }

  private updateState() {
    if (!this.mediaElement) return;
    this.onStateChange({
      isPlaying: !this.mediaElement.paused,
      currentTime: this.mediaElement.currentTime,
      duration: this.mediaElement.duration || 0,
      playbackRate: this.mediaElement.playbackRate,
      volume: this.mediaElement.volume,
      isMuted: this.mediaElement.muted
    });
  }

  togglePlay() {
    if (!this.mediaElement) return;
    if (this.mediaElement.paused) {
      this.mediaElement.play();
    } else {
      this.mediaElement.pause();
    }
  }

  seek(time: number) {
    if (!this.mediaElement) return;
    this.mediaElement.currentTime = time;
  }

  setPlaybackRate(rate: number) {
    if (!this.mediaElement) return;
    this.mediaElement.playbackRate = rate;
  }

  setVolume(volume: number) {
    if (!this.mediaElement) return;
    this.mediaElement.volume = volume;
  }

  toggleMute() {
    if (!this.mediaElement) return;
    this.mediaElement.muted = !this.mediaElement.muted;
  }

  destroy() {
    this.mediaElement = null;
  }
}
