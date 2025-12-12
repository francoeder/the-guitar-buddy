import { Component, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TrainingService } from '../../services/training.service';
import { Training, Exercise } from '../../models/training.model';
import { SafeResourcePipe } from '../../pipes/safe-resource.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MetronomeService } from '../../services/metronome.service';
import { PrepOverlayComponent } from './prep-overlay.component';
import { UsageService } from '../../services/usage.service';
import { TranslateModule } from '@ngx-translate/core';

type MediaType = 'image' | 'iframe' | 'none';

@Component({
  selector: 'app-training-runner',
  standalone: true,
  imports: [CommonModule, SafeResourcePipe, MatButtonModule, MatIconModule, PrepOverlayComponent, TranslateModule],
  template: `
    <div class="h-[100svh] overflow-hidden flex flex-col">
      <app-prep-overlay *ngIf="isPrep() && !isNextVideo()" [seconds]="prepRemaining()" [nextTitle]="prepNextTitle()" [bpm]="prepBpm()" [message]="prepMessage()"></app-prep-overlay>
      <div class="h-14 pr-3 pl-0 border-b bg-white shrink-0 relative flex items-center justify-center">
        <div class="absolute left-3">
          <button mat-raised-button color="primary" (click)="exit()">
            <mat-icon>arrow_back</mat-icon>
            {{ 'runner.exitTraining' | translate }}
          </button>
        </div>
        <div class="text-center">
          <span class="font-semibold">{{ training?.title }}</span>
          <span class="ml-2 text-gray-600" *ngIf="current() as ex">— {{ ex.title }}<ng-container *ngIf="ex.bpm > 0"> - {{ ex.bpm }} BPM</ng-container></span>
        </div>
        <div class="absolute right-3 text-sm" *ngIf="training">{{ index()+1 }} / {{ training.exercises.length }}</div>
      </div>

      <div class="flex-1 min-h-0 flex items-center justify-center bg-gray-50 overflow-hidden relative">
        <ng-container [ngSwitch]="mediaType(current()?.resourceLink)">
          <div *ngSwitchCase="'image'" class="flex-1 min-h-0 w-full h-full flex items-center justify-center overflow-hidden">
            <img [src]="current()?.resourceLink" [alt]="current()?.title || 'Exercise image'" class="block h-full w-auto max-h-full object-contain m-auto" />
          </div>
          <iframe *ngSwitchCase="'iframe'" [src]="resolveMediaSrc(current()?.resourceLink) | safeResource" [attr.id]="videoIframeId()" class="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          <div *ngSwitchDefault class="text-gray-400">No media</div>
        </ng-container>
        <div *ngIf="isVideoCurrent() && replayOverlay()" class="absolute inset-0 bg-black/100 flex items-center justify-center z-10">
          <button mat-raised-button color="primary" (click)="playAgain()">{{ 'runner.playAgain' | translate }}</button>
        </div>
        <div class="runner-overlays-left absolute left-3 bottom-3 z-20">
          <button *ngIf="!isFirst()" mat-mini-fab (click)="prev()" aria-label="Previous" class="prev-fab">
            <mat-icon>skip_previous</mat-icon>
          </button>
        </div>
        <div class="runner-overlays-right absolute right-3 bottom-3 flex flex-col items-end gap-3 z-20">
          <button *ngIf="!isVideoCurrent()" mat-mini-fab color="primary" (click)="toggle()" aria-label="Play or Pause" class="play-fab">
            <mat-icon>{{ isPlayingCombined() ? 'pause' : 'play_arrow' }}</mat-icon>
          </button>
          <button mat-mini-fab (click)="nextOrFinish()" aria-label="Next or Finish" class="relative overflow-visible next-fab">
            <mat-icon>{{ isLast() ? 'check' : 'skip_next' }}</mat-icon>
            <span *ngIf="nextHint() && (isVideoCurrent() ? replayOverlay() : (isLast() || !autoplay()))" class="pointer-events-none absolute -inset-1 hint-ring rounded-full ring-2 ring-sky-500 animate-ping"></span>
            <span *ngIf="nextHint() && (isVideoCurrent() ? replayOverlay() : (isLast() || !autoplay()))" class="pointer-events-none absolute -inset-1 hint-ring rounded-full ring-2 ring-sky-400"></span>
          </button>
        </div>
        <div *ngIf="!isVideoCurrent() && remaining() > 0" class="runner-timer-top-right absolute right-3 top-3 z-20 bg-white/80 text-black rounded px-3 py-1 text-lg">
          {{ remainingMinutes() }}:{{ remainingSeconds() | number:'2.0-0' }}
        </div>
      </div>

      <div class="p-3 bg-white border-t shrink-0 runner-controls-bottom">
        <div class="flex items-center justify-center space-x-6">
          <button *ngIf="!isFirst()" mat-raised-button (click)="prev()" class="prev-btn">
            <mat-icon>skip_previous</mat-icon>
            Previous
          </button>
          <button *ngIf="!isVideoCurrent()" mat-raised-button color="primary" (click)="toggle()" class="play-btn">
            <mat-icon>{{ isPlayingCombined() ? 'pause' : 'play_arrow' }}</mat-icon>
            {{ isPlayingCombined() ? 'Pause' : 'Play' }}
          </button>
          <button mat-raised-button class="relative overflow-visible next-btn" (click)="nextOrFinish()">
            <mat-icon>{{ isLast() ? 'check' : 'skip_next' }}</mat-icon>
            {{ isLast() ? 'Finish' : 'Next' }}
            <span *ngIf="nextHint() && (isVideoCurrent() ? replayOverlay() : (isLast() || !autoplay()))" class="pointer-events-none absolute -inset-1 hint-ring rounded-full ring-2 ring-sky-500 animate-ping"></span>
            <span *ngIf="nextHint() && (isVideoCurrent() ? replayOverlay() : (isLast() || !autoplay()))" class="pointer-events-none absolute -inset-1 hint-ring rounded-full ring-2 ring-sky-400"></span>
          </button>
        </div>
        <div class="mt-4 text-center text-2xl" [class.hidden]="isVideoCurrent()">
          {{ remainingMinutes() }}:{{ remainingSeconds() | number:'2.0-0' }}
        </div>
      </div>
    </div>
  `,
  styles: [
    `@keyframes hintBlink { 0% { box-shadow: 0 0 0 0 rgba(3,169,244,0); transform: scale(1); } 50% { box-shadow: 0 0 24px 8px rgba(3,169,244,0.7); transform: scale(1.06); } 100% { box-shadow: 0 0 0 0 rgba(3,169,244,0); transform: scale(1); } }`,
    `.hint-blink { animation: hintBlink 0.9s ease-in-out infinite; }`,
    `.hint-ring { border-radius: 9999px; }`,
    `.play-btn { --mdc-filled-button-disabled-container-color: #b0bec5; --mdc-filled-button-disabled-label-text-color: #37474f; }`,
    `.mat-mdc-raised-button.play-btn.mat-mdc-button-disabled { background-color: #b0bec5 !important; opacity: 1 !important; }`,
    `.mat-mdc-raised-button.play-btn.mat-mdc-button-disabled .mdc-button__label { color: #37474f !important; }`,
    `.mat-mdc-mini-fab.prev-fab { background-color: #1A73A8 !important; color: #ffffff !important; }`,
    `.mat-mdc-mini-fab.next-fab { background-color: #1A73A8 !important; color: #ffffff !important; }`,
    `.mat-mdc-mini-fab.play-fab { background-color: #0E3A59 !important; color: #ffffff !important; }`,
    `.mat-mdc-raised-button.prev-btn { background-color: #1A73A8 !important; color: #ffffff !important; }`,
    `.mat-mdc-raised-button.next-btn { background-color: #1A73A8 !important; color: #ffffff !important; }`,
    `.mat-mdc-raised-button.play-btn { background-color: #0E3A59 !important; color: #ffffff !important; }`,
    `.mat-mdc-mini-fab.play-fab.mat-mdc-button-disabled { background-color: #b0bec5 !important; opacity: 1 !important; }`,
    `.mat-mdc-mini-fab.play-fab.mat-mdc-button-disabled .mat-mdc-button-touch-target, .mat-mdc-mini-fab.play-fab.mat-mdc-button-disabled .mat-mdc-focus-indicator, .mat-mdc-mini-fab.play-fab.mat-mdc-button-disabled .mat-mdc-button-ripple { background-color: transparent !important; }`,
    `.mat-mdc-mini-fab.play-fab.mat-mdc-button-disabled .mat-icon { color: #37474f !important; }`,
    `.runner-overlays-left { display: none; position: absolute; }`,
    `.runner-overlays-right { display: none; position: absolute; }`,
    `.runner-timer-top-right { display: none; position: absolute; }`,
    `.runner-controls-bottom { display: block; }`,
    `@media (orientation: landscape) and (max-height: 500px) { .runner-overlays-left, .runner-overlays-right { display: flex; } .runner-timer-top-right { display: block; } .runner-controls-bottom { display: none; } }`,
    `@media (min-width: 1024px) { .runner-overlays-left, .runner-overlays-right { display: flex; } .runner-timer-top-right { display: block; } .runner-controls-bottom { display: none; } }`
  ]
})
export class TrainingRunnerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private svc = inject(TrainingService);
  metro = inject(MetronomeService);
  private usage = inject(UsageService);

  training?: Training;
  index = signal(0);
  remaining = signal(0);
  isPrep = signal(false);
  prepRemaining = signal(0);
  prepBreakSeconds = signal(0);
  autoplay = signal(false);
  nextHint = signal(false);
  shouldAutoplay = signal(false);
  replayOverlay = signal(false);
  reloadToken = signal(0);
  timerPaused = signal(false);
  private timerId?: any;
  private prepTimerId?: any;
  prepPhase = signal<'rest' | 'prep'>('prep');
  prepTargetIndex = signal<number | null>(null);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') as string;
      const applyTraining = (t?: Training | null) => {
        if (!t) {
          this.training = undefined;
          this.router.navigate(['/']);
          return;
        }
        this.usage.recordRun(id);
        this.training = t;
        this.index.set(0);
        this.startPrep(5);
        this.lockLandscape();
      };
      this.auth.authStateOnce().then(u => {
        if (!u) {
          this.router.navigate(['/login']);
          return;
        }
        const existing = this.svc.getById(id);
        if (existing) {
          applyTraining(existing);
        } else {
          this.svc.getByIdOnce(id).then(applyTraining);
        }
      });
    });
    this.route.queryParamMap.subscribe(q => {
      const a = q.get('autoplay');
      this.autoplay.set(a === null ? true : (a === '1' || a === 'true'));
    });
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.prepTimerId) clearInterval(this.prepTimerId);
    this.metro.stop();
    this.isPrep.set(false);
    this.nextHint.set(false);
  }

  current(): Exercise | undefined {
    if (!this.training) return undefined;
    return this.training.exercises[this.index()] ?? undefined;
  }

  nextExercise(): Exercise | undefined {
    if (!this.training) return undefined;
    const i = this.index() + 1;
    return this.training.exercises[i] ?? undefined;
  }

  mediaType(link?: string): MediaType {
    if (!link) return 'none';
    if (link.startsWith('data:image') || /\.(jpeg|jpg|png|webp)$/i.test(link)) return 'image';
    return 'iframe';
  }

  resolveMediaSrc(link?: string): string {
    if (!link) return '';
    if (this.isYouTubeLink(link)) {
      const embed = this.toYouTubeEmbed(link);
      const src = this.shouldAutoplay() ? this.withAutoplay(embed || link, 'youtube') : (embed || link);
      return this.withReloadToken(src);
    }
    if (this.isVimeoLink(link)) {
      const embed = this.toVimeoEmbed(link);
      const src = this.shouldAutoplay() ? this.withAutoplay(embed || link, 'vimeo') : (embed || link);
      return this.withReloadToken(src);
    }
    if (this.isDailymotionLink(link)) {
      const embed = this.toDailymotionEmbed(link);
      const src = this.shouldAutoplay() ? this.withAutoplay(embed || link, 'dailymotion') : (embed || link);
      return this.withReloadToken(src);
    }
    if (this.isFacebookLink(link)) {
      const embed = this.toFacebookEmbed(link);
      const src = this.shouldAutoplay() ? this.withAutoplay(embed || link, 'facebook') : (embed || link);
      return this.withReloadToken(src);
    }
    if (this.isGoogleDriveLink(link)) {
      const embed = this.toGoogleDriveEmbed(link);
      return this.withReloadToken(embed || link);
    }
    return this.withReloadToken(link);
  }

  private withAutoplay(src: string, provider: 'youtube' | 'vimeo' | 'dailymotion' | 'facebook'): string {
    try {
      const u = new URL(src);
      const addParam = (k: string, v: string) => u.searchParams.set(k, v);
      if (provider === 'youtube') {
        addParam('autoplay', '1');
        addParam('playsinline', '1');
        addParam('enablejsapi', '1');
        try { addParam('origin', window.location.origin); } catch {}
      } else if (provider === 'vimeo') {
        addParam('autoplay', '1');
        addParam('playsinline', '1');
        addParam('api', '1');
      } else if (provider === 'dailymotion') {
        addParam('autoplay', '1');
        addParam('api', 'postMessage');
      } else if (provider === 'facebook') {
        addParam('autoplay', '1');
      }
      return u.toString();
    } catch {
      const sep = src.includes('?') ? '&' : '?';
      if (provider === 'youtube') return `${src}${sep}autoplay=1&playsinline=1&enablejsapi=1`;
      if (provider === 'vimeo') return `${src}${sep}autoplay=1&playsinline=1&api=1`;
      if (provider === 'dailymotion') return `${src}${sep}autoplay=1&api=postMessage`;
      if (provider === 'facebook') return `${src}${sep}autoplay=1`;
      return src;
    }
  }

  private isYouTubeLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)youtube\.com$/i.test(u.hostname) || /(^|\.)youtu\.be$/i.test(u.hostname);
    } catch {
      return /youtube\.com|youtu\.be/i.test(link);
    }
  }

  private toYouTubeEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      const host = u.hostname;
      if (/(^|\.)youtube\.com$/i.test(host)) {
        if (u.pathname.startsWith('/embed/')) return link;
        const vid = u.searchParams.get('v');
        if (vid) return `https://www.youtube.com/embed/${vid}`;
        const m = u.pathname.match(/\/shorts\/([\w-]+)/i);
        if (m) return `https://www.youtube.com/embed/${m[1]}`;
      }
      if (/(^|\.)youtu\.be$/i.test(host)) {
        const id = u.pathname.replace(/^\//, '');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      return null;
    } catch {
      const be = link.match(/youtu\.be\/([\w-]+)/i);
      if (be) return `https://www.youtube.com/embed/${be[1]}`;
      const yt = link.match(/[?&]v=([\w-]+)/i);
      if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
      return null;
    }
  }

  private isVimeoLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)vimeo\.com$/i.test(u.hostname);
    } catch {
      return /vimeo\.com/i.test(link);
    }
  }

  private toVimeoEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      const p = u.pathname;
      const albumVideo = p.match(/\/album\/\d+\/video\/(\d+)/i);
      if (albumVideo && albumVideo[1]) return `https://player.vimeo.com/video/${albumVideo[1]}`;
      const channelsVideo = p.match(/\/channels\/[^/]+\/(\d+)/i);
      if (channelsVideo && channelsVideo[1]) return `https://player.vimeo.com/video/${channelsVideo[1]}`;
      const directId = p.match(/\/(\d+)/);
      if (directId && directId[1]) return `https://player.vimeo.com/video/${directId[1]}`;
      return null;
    } catch {
      const m = link.match(/vimeo\.com\/(\d+)/i);
      if (m && m[1]) return `https://player.vimeo.com/video/${m[1]}`;
      const av = link.match(/album\/\d+\/video\/(\d+)/i);
      if (av && av[1]) return `https://player.vimeo.com/video/${av[1]}`;
      return null;
    }
  }

  private isDailymotionLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)dailymotion\.com$/i.test(u.hostname) || /(^|\.)dai\.ly$/i.test(u.hostname);
    } catch {
      return /dailymotion\.com|dai\.ly/i.test(link);
    }
  }

  private toDailymotionEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      if (/(^|\.)dai\.ly$/i.test(u.hostname)) {
        const id = u.pathname.replace(/^\//, '');
        if (id) return `https://www.dailymotion.com/embed/video/${id}`;
      }
      const m = u.pathname.match(/\/video\/([\w-]+)/i);
      if (m && m[1]) return `https://www.dailymotion.com/embed/video/${m[1]}`;
      return null;
    } catch {
      const short = link.match(/dai\.ly\/([\w-]+)/i);
      if (short && short[1]) return `https://www.dailymotion.com/embed/video/${short[1]}`;
      const long = link.match(/dailymotion\.com\/video\/([\w-]+)/i);
      if (long && long[1]) return `https://www.dailymotion.com/embed/video/${long[1]}`;
      return null;
    }
  }

  private isFacebookLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)facebook\.com$/i.test(u.hostname);
    } catch {
      return /facebook\.com/i.test(link);
    }
  }

  private toFacebookEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      const href = encodeURIComponent(u.toString());
      return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=0`;
    } catch {
      const href = encodeURIComponent(link);
      return `https://www.facebook.com/plugins/video.php?href=${href}&show_text=0`;
    }
  }

  private isGoogleDriveLink(link: string): boolean {
    try {
      const u = new URL(link);
      return /(^|\.)drive\.google\.com$/i.test(u.hostname) || /(^|\.)docs\.google\.com$/i.test(u.hostname);
    } catch {
      return /drive\.google\.com|docs\.google\.com/i.test(link);
    }
  }

  private toGoogleDriveEmbed(link: string): string | null {
    try {
      const u = new URL(link);
      if (/drive\.google\.com$/i.test(u.hostname) || /docs\.google\.com$/i.test(u.hostname)) {
        const fileIdPath = u.pathname.match(/\/file\/d\/([^/]+)/i);
        if (fileIdPath && fileIdPath[1]) return `https://drive.google.com/file/d/${fileIdPath[1]}/preview`;
        const idParam = u.searchParams.get('id');
        if (idParam) return `https://drive.google.com/file/d/${idParam}/preview`;
      }
      return null;
    } catch {
      const pathId = link.match(/\/file\/d\/([^/]+)/i);
      if (pathId && pathId[1]) return `https://drive.google.com/file/d/${pathId[1]}/preview`;
      const queryId = link.match(/[?&]id=([^&]+)/i);
      if (queryId && queryId[1]) return `https://drive.google.com/file/d/${queryId[1]}/preview`;
      return null;
    }
  }

  exit() {
    this.metro.stop();
    this.router.navigate(['/']);
  }

  prev() {
    if (!this.training) return;
    this.index.set(Math.max(0, this.index() - 1));
    this.isPrep.set(false);
    this.replayOverlay.set(false);
    this.startPrep(5);
    this.lockLandscape();
    this.nextHint.set(false);
  }

  next() {
    if (!this.training) return;
    this.index.set(Math.min(this.training.exercises.length - 1, this.index() + 1));
    this.isPrep.set(false);
    this.replayOverlay.set(false);
    this.startPrep(5);
    this.lockLandscape();
    this.nextHint.set(false);
  }

  isLast() {
    return !!this.training && this.index() >= this.training.exercises.length - 1;
  }

  isFirst() {
    return !this.training || this.index() <= 0;
  }

  nextOrFinish() {
    if (this.isLast()) {
      this.nextHint.set(false);
      this.metro.stop();
      this.router.navigate(['/']);
    } else {
      this.next();
    }
  }

  toggle() {
    if (this.isVideoCurrent()) return;
    const bpm = this.current()?.bpm ?? 0;
    if (this.isPlayingCombined()) {
      if (this.timerId) clearInterval(this.timerId);
      this.timerPaused.set(true);
      this.metro.stop();
    } else {
      if (this.remaining() > 0) {
        this.resumeTimer();
      }
      if (bpm > 0) {
        if (this.metro.isPlaying()) {
          if (this.metro.currentBpm() !== bpm) {
            this.metro.stop();
            this.metro.start(bpm);
          }
        } else {
          this.metro.start(bpm);
        }
      } else {
        this.metro.stop();
      }
    }
    this.lockLandscape();
  }

  isPlayingCombined() {
    return ((!this.isVideoCurrent()) && (!this.timerPaused()) && this.remaining() > 0) || this.metro.isPlaying();
  }

  private resumeTimer() {
    const ex = this.current();
    if (!ex) return;
    this.timerPaused.set(false);
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      const r = this.remaining();
      if (r > 0) {
        this.remaining.set(r - 1);
      } else {
        clearInterval(this.timerId);
        this.metro.stop();
        if (this.isVideoCurrent()) {
          return;
        }
        if (this.autoplay() && this.training && this.index() + 1 < this.training.exercises.length) {
          const nextEx = this.nextExercise();
          const nextLink = nextEx?.resourceLink;
          const nextIsVideo = this.mediaType(nextLink) === 'iframe';
          const breakSecRaw = ex.breakSeconds ?? 0;
          if (nextIsVideo) {
            this.isPrep.set(false);
            this.shouldAutoplay.set(true);
            this.index.set(this.index() + 1);
            this.resetTimer();
            this.nextHint.set(false);
            return;
          }
          if (breakSecRaw <= 0) {
            this.isPrep.set(false);
            this.shouldAutoplay.set(nextIsVideo);
            this.index.set(this.index() + 1);
            this.resetTimer();
            this.nextHint.set(false);
            return;
          }
          const breakSec = Math.max(breakSecRaw, 5);
          const targetIdx = this.index() + 1;
          const nextLinkPrepInit = this.training?.exercises[targetIdx]?.resourceLink;
          const nextIsImagePrepInit = this.mediaType(nextLinkPrepInit) === 'image';
          const initialPrepPhase = (breakSecRaw <= 5) && nextIsImagePrepInit;
          this.isPrep.set(true);
          this.prepPhase.set(initialPrepPhase ? 'prep' : 'rest');
          this.prepTargetIndex.set(targetIdx);
          this.prepRemaining.set(breakSec);
          if (initialPrepPhase) {
            this.index.set(targetIdx);
            this.shouldAutoplay.set(false);
          }
          if (this.prepTimerId) clearInterval(this.prepTimerId);
          this.metro.stop();
          let metroStartedForPrep = false;
          this.prepTimerId = setInterval(() => {
            const r2 = this.prepRemaining();
            if (!metroStartedForPrep && r2 === 5) {
              const targetIdx = this.prepTargetIndex();
              const nextEx2 = typeof targetIdx === 'number' ? this.training?.exercises[targetIdx] : this.nextExercise();
              const nbpm = nextEx2?.bpm ?? 0;
              if (nbpm > 0) {
                if (this.metro.isPlaying()) {
                  if (this.metro.currentBpm() !== nbpm) {
                    this.metro.stop();
                    this.metro.start(nbpm);
                  }
                } else {
                  this.metro.start(nbpm);
                }
              } else {
                this.metro.stop();
              }
              this.prepPhase.set('prep');
              const nextLinkPrep = typeof targetIdx === 'number' ? this.training?.exercises[targetIdx]?.resourceLink : undefined;
              const nextIsImagePrep = this.mediaType(nextLinkPrep) === 'image';
              if (nextIsImagePrep && typeof targetIdx === 'number') {
                this.index.set(targetIdx);
                this.shouldAutoplay.set(false);
              }
              metroStartedForPrep = true;
            }
            if (r2 > 0) {
              this.prepRemaining.set(r2 - 1);
            } else {
              clearInterval(this.prepTimerId);
              this.isPrep.set(false);
              const targetIdx2 = this.prepTargetIndex();
              const nextLink2 = typeof targetIdx2 === 'number' ? this.training?.exercises[targetIdx2]?.resourceLink : this.nextExercise()?.resourceLink;
              const nextIsVideo2 = this.mediaType(nextLink2) === 'iframe';
              this.shouldAutoplay.set(nextIsVideo2);
              if (typeof targetIdx2 === 'number') {
                this.index.set(targetIdx2);
              } else {
                this.index.set(this.index() + 1);
              }
              this.resetTimer();
            }
          }, 1000);
          this.nextHint.set(false);
        } else {
          this.nextHint.set(true);
        }
      }
    }, 1000);
  }

  private resetTimer() {
    const ex = this.current();
    if (!ex) return;
    this.replayOverlay.set(false);
    const total = ex.durationMinutes * 60 + ex.durationSeconds;
    this.remaining.set(total);
    this.nextHint.set(false);
    this.timerPaused.set(false);
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      const r = this.remaining();
      if (r > 0) {
        this.remaining.set(r - 1);
      } else {
        clearInterval(this.timerId);
        this.metro.stop();
        if (this.isVideoCurrent()) {
          return;
        }
        if (this.autoplay() && this.training && this.index() + 1 < this.training.exercises.length) {
          const nextEx = this.nextExercise();
          const nextLink = nextEx?.resourceLink;
          const nextIsVideo = this.mediaType(nextLink) === 'iframe';
          const breakSecRaw = ex.breakSeconds ?? 0;
          if (nextIsVideo) {
            this.isPrep.set(false);
            this.shouldAutoplay.set(true);
            this.index.set(this.index() + 1);
            this.resetTimer();
            this.nextHint.set(false);
            return;
          }
          if (breakSecRaw <= 0) {
            this.isPrep.set(false);
            this.shouldAutoplay.set(nextIsVideo);
            this.index.set(this.index() + 1);
            this.resetTimer();
            this.nextHint.set(false);
            return;
          }
          const breakSec = Math.max(breakSecRaw, 5);
          const targetIdx = this.index() + 1;
          const nextLinkPrepInit = this.training?.exercises[targetIdx]?.resourceLink;
          const nextIsImagePrepInit = this.mediaType(nextLinkPrepInit) === 'image';
          const initialPrepPhase = (breakSecRaw <= 5);
          this.isPrep.set(true);
          this.prepPhase.set(initialPrepPhase ? 'prep' : 'rest');
          this.prepTargetIndex.set(targetIdx);
          this.prepRemaining.set(breakSec);
          this.prepBreakSeconds.set(breakSec);
          if (initialPrepPhase) {
            this.index.set(targetIdx);
            this.shouldAutoplay.set(false);
          }
          if (this.prepTimerId) clearInterval(this.prepTimerId);
          this.metro.stop();
          let metroStartedForPrep = false;
          this.prepTimerId = setInterval(() => {
            const r2 = this.prepRemaining();
            if (!metroStartedForPrep && r2 === 5) {
              const targetIdx = this.prepTargetIndex();
              const nextEx2 = typeof targetIdx === 'number' ? this.training?.exercises[targetIdx] : this.nextExercise();
              const nbpm = nextEx2?.bpm ?? 0;
              if (nbpm > 0) {
                if (this.metro.isPlaying()) {
                  if (this.metro.currentBpm() !== nbpm) {
                    this.metro.stop();
                    this.metro.start(nbpm);
                  }
                } else {
                  this.metro.start(nbpm);
                }
              } else {
                this.metro.stop();
              }
              this.prepPhase.set('prep');
              // Swap visual to next exercise image when Get Ready appears
              const nextLinkPrep = typeof targetIdx === 'number' ? this.training?.exercises[targetIdx]?.resourceLink : undefined;
              const nextIsImagePrep = this.mediaType(nextLinkPrep) === 'image';
              if (nextIsImagePrep && typeof targetIdx === 'number') {
                this.index.set(targetIdx);
                this.shouldAutoplay.set(false);
              }
              metroStartedForPrep = true;
            }
            if (r2 > 0) {
              this.prepRemaining.set(r2 - 1);
            } else {
              clearInterval(this.prepTimerId);
              this.isPrep.set(false);
              const targetIdx2 = this.prepTargetIndex();
              const nextLink2 = typeof targetIdx2 === 'number' ? this.training?.exercises[targetIdx2]?.resourceLink : this.nextExercise()?.resourceLink;
              const nextIsVideo2 = this.mediaType(nextLink2) === 'iframe';
              this.shouldAutoplay.set(nextIsVideo2);
              if (typeof targetIdx2 === 'number') {
                this.index.set(targetIdx2);
              } else {
                this.index.set(this.index() + 1);
              }
              this.resetTimer();
            }
          }, 1000);
          this.nextHint.set(false);
        } else {
          this.nextHint.set(true);
        }
      }
    }, 1000);
    if (this.isYouTubeLink(ex.resourceLink ?? '')) {
      setTimeout(() => this.setupYouTubeBridge(), 600);
    }

    const bpm = ex.bpm;
    if (this.isVideoCurrent()) {
      this.metro.stop();
    } else if (bpm > 0) {
      if (this.metro.isPlaying()) {
        if (this.metro.currentBpm() !== bpm) {
          this.metro.stop();
          this.metro.start(bpm);
        }
      } else {
        this.metro.start(bpm);
      }
    } else {
      this.metro.stop();
    }
  }

  isVideoCurrent() {
    return this.mediaType(this.current()?.resourceLink) === 'iframe';
  }

  isNextVideo() {
    const idx = this.prepTargetIndex();
    const link = typeof idx === 'number' ? this.training?.exercises[idx]?.resourceLink : this.nextExercise()?.resourceLink;
    return this.mediaType(link) === 'iframe';
  }

  playAgain() {
    this.replayOverlay.set(false);
    this.shouldAutoplay.set(true);
    this.reloadToken.set(this.reloadToken() + 1);
    this.resetTimer();
  }

  private withReloadToken(src: string): string {
    try {
      const u = new URL(src);
      u.searchParams.set('gbt', String(this.reloadToken()));
      return u.toString();
    } catch {
      const sep = src.includes('?') ? '&' : '?';
      return `${src}${sep}gbt=${this.reloadToken()}`;
    }
  }

  videoIframeId() {
    return `gb-video-${this.index()}`;
  }

  @HostListener('window:message', ['$event'])
  onVideoMessage(ev: MessageEvent) {
    const origin = String(ev.origin || '');
    const data = typeof ev.data === 'string' ? this.tryParse(ev.data) : ev.data;
    if (!this.isVideoCurrent()) return;
    if (!data) return;
    const ex = this.current();
    const totalDur = ((ex?.durationMinutes ?? 0) * 60) + (ex?.durationSeconds ?? 0);
    const shouldHintOnOverlay = this.autoplay() && totalDur === 0;
    if (/youtube\-nocookie\.com|youtube\.com/i.test(origin)) {
      if (data.event === 'onReady') {
        if (this.shouldAutoplay()) {
          const id = this.videoIframeId();
          const el = document.getElementById(id) as HTMLIFrameElement | null;
          if (el) {
            const ytOrigin = el.src.includes('youtube-nocookie.com') ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
            el.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo' }), ytOrigin);
          }
        }
      }
      if (data.event === 'onStateChange' && data.info === 0) {
        this.replayOverlay.set(true);
        this.nextHint.set(true);
      }
      if (data.event === 'infoDelivery' && data.info && typeof data.info.playerState === 'number' && data.info.playerState === 0) {
        this.replayOverlay.set(true);
        this.nextHint.set(true);
      }
    } else if (/vimeo\.com/i.test(origin)) {
      if (data.event === 'ended' || data.event === 'finish') {
        this.replayOverlay.set(true);
        this.nextHint.set(true);
      }
    } else if (/dailymotion\.com|dai\.ly/i.test(origin)) {
      if (data.event === 'ended' || data.type === 'ended') {
        this.replayOverlay.set(true);
        this.nextHint.set(true);
      }
    }
  }

  private tryParse(x: string) {
    try { return JSON.parse(x); } catch { return null; }
  }

  private setupYouTubeBridge() {
    const id = this.videoIframeId();
    const el = document.getElementById(id) as HTMLIFrameElement | null;
    if (!el) return;
    const link = this.current()?.resourceLink ?? '';
    if (!this.isYouTubeLink(link)) return;
    const origin = el.src.includes('youtube-nocookie.com') ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
    const post = (payload: any) => el.contentWindow?.postMessage(JSON.stringify(payload), origin);
    let tries = 0;
    const tryRegister = () => {
      tries++;
      post({ event: 'listening', id });
      post({ event: 'addEventListener', id, func: 'onStateChange' });
      post({ event: 'addEventListener', id, func: 'onReady' });
      post({ event: 'addEventListener', id, func: 'infoDelivery' });
      if (tries < 5) setTimeout(tryRegister, 500);
    };
    tryRegister();
  }

  private startPrep(seconds = 5) {
    if (!this.training || !this.current()) return this.resetTimer();
    const link = this.current()?.resourceLink;
    if (this.mediaType(link) === 'iframe') {
      this.isPrep.set(false);
      this.shouldAutoplay.set(true);
      this.replayOverlay.set(false);
      return this.resetTimer();
    }
    this.isPrep.set(true);
    this.prepPhase.set('prep');
    this.prepTargetIndex.set(this.index());
    this.prepRemaining.set(seconds);
    this.prepBreakSeconds.set(seconds);
    this.nextHint.set(false);
    if (this.timerId) clearInterval(this.timerId);
    if (this.prepTimerId) clearInterval(this.prepTimerId);
    const ex = this.current();
    const bpm = ex?.bpm ?? 0;
    this.metro.stop();
    this.prepTimerId = setInterval(() => {
      const r = this.prepRemaining();
      if (r === 5) {
        this.prepPhase.set('prep');
        if (bpm > 0) {
          if (this.metro.isPlaying()) {
            if (this.metro.currentBpm() !== bpm) {
              this.metro.stop();
              this.metro.start(bpm);
            }
          } else {
            this.metro.start(bpm);
          }
        } else {
          this.metro.stop();
        }
      }
      if (r > 0) {
        this.prepRemaining.set(r - 1);
      } else {
        clearInterval(this.prepTimerId);
        this.isPrep.set(false);
        this.resetTimer();
      }
    }, 1000);
  }

  prepNextTitle() {
    if (!this.training) return undefined;
    const idx = this.prepTargetIndex();
    if (idx === null) return this.current()?.title;
    return this.training.exercises[idx]?.title ?? this.current()?.title;
  }

  prepBpm() {
    if (!this.training) return 0;
    const idx = this.prepTargetIndex();
    if (idx === null) return this.current()?.bpm ?? 0;
    return this.training.exercises[idx]?.bpm ?? 0;
  }

  prepMessage() {
    const b = this.prepBreakSeconds();
    const r = this.prepRemaining();
    if (b <= 5) return 'runner.prep.getReady';
    return r > 5 ? 'runner.prep.restTime' : 'runner.prep.getReady';
  }

  remainingMinutes() {
    return Math.floor(this.remaining() / 60);
  }

  remainingSeconds() {
    return this.remaining() % 60;
  }

  prepMinutes() {
    return Math.floor(this.prepRemaining() / 60);
  }

  prepSeconds() {
    return this.prepRemaining() % 60;
  }

  private async lockLandscape() {
    try {
      // @ts-ignore
      if (screen.orientation && screen.orientation.lock) {
        // @ts-ignore
        await screen.orientation.lock('landscape');
      }
    } catch {}
  }
  @HostListener('document:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent) {
    this.metro.unlock();
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this.nextOrFinish();
    } else if (ev.key === 'Backspace') {
      ev.preventDefault();
      this.prev();
    }
  }

  @HostListener('window:popstate')
  onPopState() {
    if (this.timerId) clearInterval(this.timerId);
    if (this.prepTimerId) clearInterval(this.prepTimerId);
    this.metro.stop();
    this.isPrep.set(false);
    this.nextHint.set(false);
  }

  @HostListener('document:click')
  onGlobalClick() {
    this.metro.unlock();
    this.unmuteCurrentVideo();
  }

  @HostListener('document:touchstart')
  onGlobalTouch() {
    this.metro.unlock();
    this.unmuteCurrentVideo();
  }

  private unmuteCurrentVideo() {
    if (!this.isVideoCurrent()) return;
    const id = this.videoIframeId();
    const el = document.getElementById(id) as HTMLIFrameElement | null;
    if (!el) return;
    const link = this.current()?.resourceLink ?? '';
    if (this.isYouTubeLink(link)) {
      const ytOrigin = el.src.includes('youtube-nocookie.com') ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
      el.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'unMute' }), ytOrigin);
    } else if (this.isVimeoLink(link)) {
      el.contentWindow?.postMessage(JSON.stringify({ method: 'setVolume', value: 1 }), '*');
    } else if (this.isDailymotionLink(link)) {
      try {
        el.contentWindow?.postMessage(JSON.stringify({ event: 'volume', value: 1 }), '*');
      } catch {}
    }
  }
}
