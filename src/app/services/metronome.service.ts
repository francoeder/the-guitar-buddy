import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MetronomeService {
  isPlaying = signal(false);
  currentBpm = signal(0);

  private audioCtx?: AudioContext;
  private nextTickTime = 0;
  private schedulerId?: number;

  start(bpm: number) {
    if (bpm <= 0) return;
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    this.currentBpm.set(bpm);
    this.isPlaying.set(true);
    this.nextTickTime = (this.audioCtx as AudioContext).currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying.set(false);
    this.currentBpm.set(0);
    if (this.schedulerId) {
      clearTimeout(this.schedulerId);
      this.schedulerId = undefined;
    }
  }

  toggle(bpm: number) {
    if (this.isPlaying()) this.stop(); else this.start(bpm);
  }

  private scheduler() {
    if (!this.audioCtx || !this.isPlaying()) return;
    const secondsPerBeat = 60 / this.currentBpm();
    while (this.nextTickTime < this.audioCtx.currentTime + 0.1) {
      this.scheduleClick(this.nextTickTime);
      this.nextTickTime += secondsPerBeat;
    }
    this.schedulerId = setTimeout(() => this.scheduler(), 25) as unknown as number;
  }

  private scheduleClick(time: number) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1000;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}
