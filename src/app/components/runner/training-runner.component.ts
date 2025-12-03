import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { Training, Exercise } from '../../models/training.model';
import { SafeResourcePipe } from '../../pipes/safe-resource.pipe';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MetronomeService } from '../../services/metronome.service';
import { PrepOverlayComponent } from './prep-overlay.component';

type MediaType = 'image' | 'iframe' | 'none';

@Component({
  selector: 'app-training-runner',
  standalone: true,
  imports: [CommonModule, SafeResourcePipe, MatButtonModule, MatIconModule, PrepOverlayComponent],
  template: `
    <div class="h-[100svh] overflow-hidden flex flex-col">
      <app-prep-overlay *ngIf="isPrep()" [seconds]="prepRemaining()" [nextTitle]="current()?.title"></app-prep-overlay>
      <div class="h-14 pr-3 pl-0 border-b bg-white shrink-0 relative flex items-center justify-center">
        <div class="absolute left-3">
          <button mat-raised-button color="primary" (click)="back()">
            <mat-icon>arrow_back</mat-icon>
            Back
          </button>
        </div>
        <div class="text-center">
          <span class="font-semibold">{{ training?.title }}</span>
          <span class="ml-2 text-gray-600" *ngIf="current() as ex">— {{ ex.title }}</span>
        </div>
        <div class="absolute right-3 text-sm" *ngIf="training">{{ index()+1 }} / {{ training.exercises.length }}</div>
      </div>

      <div class="flex-1 min-h-0 flex items-center justify-center bg-gray-50 overflow-hidden">
        <ng-container [ngSwitch]="mediaType(current()?.resourceLink)">
          <img *ngSwitchCase="'image'" [src]="current()?.resourceLink" class="max-h-full max-w-full object-contain" />
          <iframe *ngSwitchCase="'iframe'" [src]="current()?.resourceLink | safeResource" class="w-full h-full"></iframe>
          <div *ngSwitchDefault class="text-gray-400">No media</div>
        </ng-container>
      </div>

      <div class="p-3 bg-white border-t shrink-0">
        <div class="flex items-center justify-center space-x-6">
          <button mat-raised-button (click)="prev()">
            <mat-icon>skip_previous</mat-icon>
            Previous
          </button>
          <button mat-raised-button color="primary" (click)="toggle()">
            <mat-icon>{{ metro.isPlaying() ? 'pause' : 'play_arrow' }}</mat-icon>
            {{ metro.isPlaying() ? 'Pause' : 'Play' }}
          </button>
          <button mat-raised-button class="relative overflow-visible" (click)="nextOrFinish()">
            <mat-icon>{{ isLast() ? 'check' : 'skip_next' }}</mat-icon>
            {{ isLast() ? 'Finish' : 'Next' }}
            <span *ngIf="nextHint() && (isLast() || !autoplay())" class="pointer-events-none absolute -inset-1 hint-ring ring-2 ring-sky-500 animate-ping"></span>
            <span *ngIf="nextHint() && (isLast() || !autoplay())" class="pointer-events-none absolute -inset-1 hint-ring ring-2 ring-sky-400"></span>
          </button>
        </div>
        <div class="mt-4 text-center text-2xl">
          {{ remainingMinutes() }}:{{ remainingSeconds() | number:'2.0-0' }}
        </div>
      </div>
    </div>
  `,
  styles: [
    `@keyframes hintBlink { 0% { box-shadow: 0 0 0 0 rgba(3,169,244,0); transform: scale(1); } 50% { box-shadow: 0 0 24px 8px rgba(3,169,244,0.7); transform: scale(1.06); } 100% { box-shadow: 0 0 0 0 rgba(3,169,244,0); transform: scale(1); } }`,
    `.hint-blink { animation: hintBlink 0.9s ease-in-out infinite; }`,
    `.hint-ring { border-radius: 9999px; }`
  ]
})
export class TrainingRunnerComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(TrainingService);
  metro = inject(MetronomeService);

  training?: Training;
  index = signal(0);
  remaining = signal(0);
  isPrep = signal(false);
  prepRemaining = signal(0);
  autoplay = signal(false);
  nextHint = signal(false);
  private timerId?: any;
  private prepTimerId?: any;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id') as string;
      this.training = this.svc.getById(id);
      this.index.set(0);
      this.startPrep(5);
      this.lockLandscape();
    });
    this.route.queryParamMap.subscribe(q => {
      const a = q.get('autoplay');
      this.autoplay.set(a === '1' || a === 'true');
    });
  }

  current(): Exercise | undefined {
    if (!this.training) return undefined;
    return this.training.exercises[this.index()] ?? undefined;
  }

  mediaType(link?: string): MediaType {
    if (!link) return 'none';
    if (link.startsWith('data:image') || /\.(jpeg|jpg|png|webp)$/i.test(link)) return 'image';
    return 'iframe';
  }

  back() {
    this.metro.stop();
    this.router.navigate(['/']);
  }

  prev() {
    if (!this.training) return;
    this.index.set(Math.max(0, this.index() - 1));
    this.isPrep.set(false);
    this.startPrep(3);
    this.lockLandscape();
    this.nextHint.set(false);
  }

  next() {
    if (!this.training) return;
    this.index.set(Math.min(this.training.exercises.length - 1, this.index() + 1));
    this.isPrep.set(false);
    this.startPrep(3);
    this.lockLandscape();
    this.nextHint.set(false);
  }

  isLast() {
    return !!this.training && this.index() >= this.training.exercises.length - 1;
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
    const bpm = this.current()?.bpm ?? 0;
    this.metro.toggle(bpm);
    this.lockLandscape();
  }

  private resetTimer() {
    const ex = this.current();
    if (!ex) return;
    const total = ex.durationMinutes * 60 + ex.durationSeconds;
    this.remaining.set(total);
    this.nextHint.set(false);
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      const r = this.remaining();
      if (r > 0) {
        this.remaining.set(r - 1);
      } else {
        clearInterval(this.timerId);
        this.metro.stop();
        if (this.autoplay() && this.training && this.index() + 1 < this.training.exercises.length) {
          this.index.set(this.index() + 1);
          this.startPrep(3);
          this.nextHint.set(false);
        } else {
          this.nextHint.set(true);
        }
      }
    }, 1000);

    const bpm = ex.bpm;
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

  private startPrep(seconds = 5) {
    if (!this.training || !this.current()) return this.resetTimer();
    this.isPrep.set(true);
    this.prepRemaining.set(seconds);
    this.nextHint.set(false);
    this.metro.stop();
    if (this.timerId) clearInterval(this.timerId);
    if (this.prepTimerId) clearInterval(this.prepTimerId);
    this.prepTimerId = setInterval(() => {
      const r = this.prepRemaining();
      if (r > 0) this.prepRemaining.set(r - 1);
      else {
        clearInterval(this.prepTimerId);
        this.isPrep.set(false);
        this.resetTimer();
      }
    }, 1000);
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
    if (ev.key === 'Enter') {
      ev.preventDefault();
      this.nextOrFinish();
    } else if (ev.key === 'Backspace') {
      ev.preventDefault();
      this.prev();
    }
  }
}
