import { Component, Input, OnChanges, SimpleChanges, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

const REST_TIME_KEY = 'runner.prep.restTime';
const GET_READY_KEY = 'runner.prep.getReady';
const GO_KEY = 'runner.prep.go';
const DEFAULT_SECONDS = 5;

type OverlayViewMode = 'rest' | 'get-ready' | 'counting' | 'go';

@Component({
  selector: 'app-prep-overlay',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="fixed inset-0 z-40 box-border bg-gray-50/95">
      <!-- Container de Layout Absoluto para garantir posicionamento fixo e evitar pulos -->
      <div class="absolute inset-0 flex flex-col items-center justify-center pb-20 landscape:pb-12 pointer-events-none">
        
        <!-- Wrapper Central com Interação Ativa -->
        <div class="flex flex-col items-center justify-center w-full max-w-4xl pointer-events-auto">
          
          <!-- ROW 2: Conteúdo Principal (Altura Fixa Rígida) -->
          <!-- A altura fixa (h-...) garante que a troca de conteúdo não mova os elementos ao redor -->
          <!-- Ajuste de alturas: Mobile Portrait (180px), Mobile Landscape (140px), Tablet (220px), Desktop Landscape (>220px) -->
          <!-- lg:landscape define o ponto de corte para Desktop (Largura > 1024px) -->
          <div class="flex flex-col items-center justify-center w-full h-[180px] sm:h-[220px] landscape:h-[140px] md:landscape:h-[140px] lg:landscape:h-[240px] mb-2 landscape:mb-0 md:landscape:mb-0 lg:landscape:mb-2">
            @switch (currentView) {
              @case ('rest') {
                <!-- Barra de Progresso -->
                <div class="w-full max-w-xl h-4 sm:h-6 bg-gray-200 rounded-full overflow-hidden shadow-inner mb-4 landscape:mb-2 md:landscape:mb-2 lg:landscape:mb-4">
                  <div class="h-full bg-[#38D6F3] transition-all duration-300 ease-linear" [style.width.%]="progressPercent"></div>
                </div>

                <!-- Texto de Descanso -->
                @if (!hasMetronome) {
                  <div class="text-[#0E3A59] font-bold text-3xl landscape:text-3xl sm:text-5xl md:text-6xl md:landscape:text-3xl lg:landscape:text-6xl text-center">
                    {{ 'runner.prep.restTime' | translate }}
                  </div>
                }
              }
              @case ('get-ready') {
                @if (!hasMetronome) {
                  <div class="text-[#0E3A59] font-bold text-4xl landscape:text-4xl sm:text-6xl md:text-7xl md:landscape:text-4xl lg:landscape:text-7xl text-center countdown-anim">
                    {{ 'runner.prep.getReady' | translate }}
                  </div>
                }
              }
              @case ('counting') {
                <div class="font-bold text-7xl landscape:text-6xl sm:text-8xl md:text-9xl md:landscape:text-6xl lg:landscape:text-9xl leading-none countdown-anim"
                     [ngClass]="countColorClass">
                  {{ countDisplay }}
                </div>
              }
              @case ('go') {
                <div class="text-[#0E3A59] font-bold text-5xl landscape:text-5xl sm:text-7xl md:text-8xl md:landscape:text-5xl lg:landscape:text-8xl text-center countdown-anim">
                  {{ 'runner.prep.go' | translate }}
                </div>
              }
            }
          </div>

          <!-- ROW 3: Submensagem (Altura Fixa Rígida) -->
          <div class="flex items-start justify-center w-full h-12 sm:h-16 landscape:h-10 md:landscape:h-10 lg:landscape:h-20">
            @if (currentView === 'counting' || (hasMetronome && (currentView === 'get-ready' || currentView === 'rest'))) {
              <div class="text-[#0E3A59] font-bold text-2xl landscape:text-2xl sm:text-4xl md:text-5xl md:landscape:text-2xl lg:landscape:text-5xl text-center leading-tight">
                @if (currentView === 'rest') {
                  {{ 'runner.prep.restTime' | translate }}
                } @else if (currentView === 'get-ready') {
                  {{ 'runner.prep.getReady' | translate }}
                } @else {
                  {{ subMessageKey | translate }}
                }
              </div>
            }
          </div>

        </div>
      </div>

      <!-- FOOTER: Informações fixas na parte inferior (Absoluto) -->
      <!-- Volta a ser absoluto para garantir que fique no fundo sem empurrar o conteúdo central -->
      <div class="absolute bottom-6 landscape:bottom-2 md:bottom-12 md:landscape:bottom-12 left-0 right-0 text-center text-gray-800 pointer-events-none px-4">
        @if (nextTitle) {
          <div class="text-lg landscape:text-base sm:text-xl md:text-2xl md:landscape:text-2xl font-semibold mb-1 truncate">
            {{ 'runner.prep.nextExercise' | translate }} <span class="text-gray-900">{{ nextTitle }}</span>
          </div>
        }
        @if (bpm > 0) {
          <div class="text-base landscape:text-sm sm:text-lg md:text-xl md:landscape:text-xl font-medium text-gray-600">
            {{ 'runner.prep.bpm' | translate }} <span class="text-gray-900">{{ bpm }}</span>
            @if (beatStyle && beatStyle !== 'none') {
               <span class="mx-2 text-gray-400">|</span> <span class="text-gray-900">{{ beatStyle }}</span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `@keyframes countdownPulse { 0% { transform: scale(0.95); opacity: 0.9; } 50% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.9; } }`,
    `.countdown-anim { animation: countdownPulse 0.8s ease-in-out infinite; }`
  ]
})
export class PrepOverlayComponent implements OnChanges, OnInit, OnDestroy {
  @Input() seconds = DEFAULT_SECONDS;
  @Input() nextTitle?: string;
  @Input() bpm = 0;
  @Input() phase: 'rest' | 'prep' = 'prep';
  @Input() beatStyle: 'none' | '4/4' | '3/4' | '2/4' = 'none';
  @Input() prepMeasures = 0;
  @Input() beatTick = 0;
  @Input() beatInMeasure = 1;
  @Input() breakSeconds = 0;
  @Input() autoplay = true;

  private readonly cdr = inject(ChangeDetectorRef);

  private initialSeconds: number | null = null;
  private currentSeconds = DEFAULT_SECONDS;
  private lastSecondChangeMs = 0;
  private rafId: number | null = null;
  
  progressPercent = 100;
  countDisplay: number | null = null;
  
  private beatsPerMeasure = 1;
  private secondsPerBeat = 0;
  private measureSeconds = 0;

  get currentView(): OverlayViewMode {
    if (this.phase === 'rest' && this.seconds > 0) {
      return 'rest';
    }

    if (this.hasMetronome) {
      // Se tem metrônomo: mostra contagem se estiver rodando (tick > 0), senão Prepare-se
      if (this.beatTick > 0) {
        return 'counting';
      }
      return 'get-ready';
    } else {
      // Sem metrônomo: mostra Prepare-se, mas no finalzinho mostra Vai!
      // Assumindo que o último segundo (1) é o momento do Vai!
      if (this.seconds <= 1) {
        return 'go';
      }
      return 'get-ready';
    }
  }

  get subMessageKey(): string {
    // Usado apenas no modo 'counting'
    // O "Vai!" só deve aparecer no último beat do ÚLTIMO compasso de preparação.
    
    // Calculamos o total de beats esperados na preparação
    const totalBeats = this.prepMeasures * this.beatsPerMeasure;
    
    // Se o tick atual for igual ou maior ao total de beats, estamos no último tempo do último compasso
    if (this.beatTick >= totalBeats) {
      return GO_KEY;
    }
    
    return GET_READY_KEY;
  }

  get countColorClass(): string {
    // 1: Orange Focus (#FF8A47) - Destaque final
    // Outros: Deep Blue (#0E3A59) - Padrão do tema
    return this.beatInMeasure === 1 ? 'text-[#FF8A47]' : 'text-[#0E3A59]';
  }

  get isRestTime(): boolean {
    return this.phase === 'rest' && this.seconds > 0;
  }

  get hasMetronome(): boolean {
    return this.bpm > 0 && this.prepMeasures > 0;
  }

  private get showCount(): boolean {
    if (this.phase === 'rest' || !this.hasMetronome) {
      return false;
    }
    return this.countDisplay !== null;
  }

  private get overrideCountWithReady(): boolean {
    if (!this.autoplay || this.breakSeconds > 5 || this.phase === 'rest' || !this.hasMetronome) {
      return false;
    }
    
    const threshold = this.metroStartThresholdSeconds();
    if (this.seconds > threshold) {
      return false;
    }
    
    return this.beatTick === 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['seconds']) {
      this.handleSecondsChange(changes['seconds'].currentValue);
    }

    if (changes['bpm'] || changes['beatStyle'] || changes['prepMeasures']) {
      this.recomputeBeatData();
    }

    if (changes['beatTick']) {
      this.handleBeatTickChange(changes['beatTick'].currentValue);
    }
  }

  ngOnInit(): void {
    this.lastSecondChangeMs = performance.now();
    this.startRaf();
    this.recomputeBeatData();
  }

  ngOnDestroy(): void {
    this.stopRaf();
  }

  private handleSecondsChange(curr: number): void {
    this.updateInitialSeconds(curr);
    
    this.currentSeconds = curr;
    this.lastSecondChangeMs = performance.now();
    this.updateProgress();
    
    this.ensureRafRunning();
  }

  private updateInitialSeconds(curr: number): void {
    if (curr > 0 && (this.initialSeconds === null || curr > this.initialSeconds)) {
      this.initialSeconds = curr;
    }
  }

  private ensureRafRunning(): void {
    if (this.rafId === null) {
      this.startRaf();
    }
  }

  private handleBeatTickChange(tick: number): void {
    if (this.shouldClearCountDisplay(tick)) {
      this.countDisplay = null;
      this.cdr.detectChanges();
      return;
    }

    const totalBeats = this.prepMeasures * this.beatsPerMeasure;
    
    if (tick <= totalBeats) {
      this.countDisplay = this.beatInMeasure || null;
    }
    
    this.cdr.detectChanges();
  }

  private shouldClearCountDisplay(tick: number): boolean {
    if (this.phase === 'rest') return true;
    
    const isValidTick = typeof tick === 'number' && tick > 0;
    if (!isValidTick) return true;
    
    if (!this.hasMetronome) return true;
    
    return false;
  }

  private updateProgress(): void {
    if (!this.initialSeconds || this.initialSeconds <= 0) {
      this.progressPercent = 100;
      return;
    }

    const elapsed = (performance.now() - this.lastSecondChangeMs) / 1000;
    const remaining = Math.max(this.currentSeconds - elapsed, 0);

    if (this.isRestTime) {
      this.calculateRestTimeProgress(remaining);
    } else {
      this.progressPercent = (remaining / this.initialSeconds) * 100;
    }
  }

  private calculateRestTimeProgress(remaining: number): void {
    if (!this.initialSeconds) return;

    const threshold = Math.min(this.initialSeconds, this.metroStartThresholdSeconds());
    const window = Math.max(this.initialSeconds - threshold, 0);

    if (window <= 0) {
      this.progressPercent = (remaining / this.initialSeconds) * 100;
      return;
    } 
    
    const remainingUntilMetroStart = Math.max(remaining - threshold, 0);
    this.progressPercent = (remainingUntilMetroStart / window) * 100;
  }

  private startRaf(): void {
    const loop = () => {
      if (this.seconds <= 0) {
        this.stopRaf();
        return;
      }
      this.updateProgress();
      this.cdr.detectChanges();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private stopRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private recomputeBeatData(): void {
    const beatsMap: Record<string, number> = { '4/4': 4, '3/4': 3, '2/4': 2 };
    this.beatsPerMeasure = beatsMap[this.beatStyle] || 1;
    this.secondsPerBeat = this.bpm > 0 ? (60 / this.bpm) : 0;
    this.measureSeconds = this.beatsPerMeasure * this.secondsPerBeat;
  }

  private metroStartThresholdSeconds(): number {
    if (!this.hasMetronome) return 0;
    const measuresTime = this.prepMeasures * this.measureSeconds;
    return Math.max(1, Math.ceil(measuresTime));
  }
}
