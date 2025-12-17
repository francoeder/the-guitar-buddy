import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MetronomeService {
  isPlaying = signal(false);
  currentBpm = signal(0);
  beatStyle = signal<'none' | '4/4' | '3/4' | '2/4'>('none');
  beatTick = signal(0);
  beatInMeasure = signal(1);

  private audioCtx?: AudioContext;
  private nextTickTime = 0;
  private schedulerId?: number;
  private beatIndex = 0;
  private measureBeats = 1;
  private runId = 0;

  async unlock(): Promise<void> {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch { void 0; }
    }
  }

  async start(bpm: number) {
    if (bpm <= 0) return;
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch { void 0; }
    }
    this.currentBpm.set(bpm);
    this.isPlaying.set(true);
    this.runId++;
    this.beatIndex = 0;
    this.measureBeats = this.resolveBeatsPerMeasure(this.beatStyle());
    this.nextTickTime = (this.audioCtx as AudioContext).currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.isPlaying.set(false);
    this.currentBpm.set(0);
    this.beatIndex = 0;
    this.beatTick.set(0);
    this.beatInMeasure.set(1);
    if (this.schedulerId) {
      clearTimeout(this.schedulerId);
      this.schedulerId = undefined;
    }
  }

  async toggle(bpm: number) {
    if (this.isPlaying()) this.stop(); else await this.start(bpm);
  }

  setBeatStyle(style: 'none' | '4/4' | '3/4' | '2/4') {
    const current = this.beatStyle();
    if (current === style) return;
    this.beatStyle.set(style);
    const newBeats = this.resolveBeatsPerMeasure(style);
    this.measureBeats = newBeats;
    this.beatIndex = this.beatIndex % newBeats;
  }
 
  setBpm(bpm: number) {
    if (bpm <= 0) return;
    this.currentBpm.set(bpm);
  }

  async startWithAlignment(bpm: number, style: 'none' | '4/4' | '3/4' | '2/4', measuresToPlay: number, secondsUntilExerciseStart: number) {
    if (bpm <= 0) return;
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    if (this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch { void 0; }
    }
    this.setBeatStyle(style);
    this.currentBpm.set(bpm);
    this.isPlaying.set(true);
    this.runId++;
    this.beatIndex = 0;
    this.beatTick.set(0);
    this.beatInMeasure.set(1);
    const beats = this.measureBeats;
    const secondsPerBeat = 60 / bpm;
    const measureSeconds = beats * secondsPerBeat;
    const offset = Math.max(0, secondsUntilExerciseStart - (measuresToPlay * measureSeconds));
    this.nextTickTime = (this.audioCtx as AudioContext).currentTime + offset;
    this.scheduler();
  }

  secondsUntilMeasureEnd(): number {
    const bpm = this.currentBpm();
    if (!this.audioCtx || !this.isPlaying() || bpm <= 0) return 0;
    const secondsPerBeat = 60 / bpm;
    const beats = this.measureBeats;
    const timeToNextBeat = Math.max(0, this.nextTickTime - this.audioCtx.currentTime);
    if (beats <= 1) return timeToNextBeat;
    if (this.beatIndex === 0) return timeToNextBeat;
    const beatsRemainingAfterNext = (beats - this.beatIndex) % beats;
    return timeToNextBeat + (beatsRemainingAfterNext * secondsPerBeat);
  }

  private resolveBeatsPerMeasure(style: 'none' | '4/4' | '3/4' | '2/4') {
    if (style === '4/4') return 4;
    if (style === '3/4') return 3;
    if (style === '2/4') return 2;
    return 1;
  }

  private scheduler() {
    if (!this.audioCtx || !this.isPlaying()) return;
    const currentRunId = this.runId;
    const secondsPerBeat = 60 / this.currentBpm();
    while (this.nextTickTime < this.audioCtx.currentTime + 0.1) {
      const style = this.beatStyle();
      const accent = style !== 'none' && this.beatIndex === 0;
      const currentBeatNumber = (this.beatIndex % this.measureBeats) + 1;
      this.scheduleClick(this.nextTickTime, accent);
      const delayMs = Math.max(0, Math.floor((this.nextTickTime - this.audioCtx.currentTime) * 1000));
      setTimeout(() => {
        if (!this.isPlaying() || this.runId !== currentRunId) return;
        this.beatInMeasure.set(currentBeatNumber);
        this.beatTick.set(this.beatTick() + 1);
      }, delayMs);
      this.nextTickTime += secondsPerBeat;
      const beats = this.measureBeats;
      if (beats <= 1) {
        this.beatIndex = 0;
      } else {
        this.beatIndex = (this.beatIndex + 1) % beats;
      }
    }
    this.schedulerId = setTimeout(() => this.scheduler(), 25) as unknown as number;
  }

  private scheduleClick(time: number, accent: boolean) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.7 : 0.5, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}
