import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-prep-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-40 box-border bg-white/95 border-8 border-indigo-500 flex items-center justify-center">
      <div class="text-center">
        <div class="text-indigo-600 font-bold text-7xl md:text-8xl leading-none countdown-anim">
          <ng-container *ngIf="seconds > 0; else goText">{{ seconds }}</ng-container>
          <ng-template #goText>Go!</ng-template>
        </div>
        <div class="mt-4 text-gray-600 text-2xl tracking-wide">Get Ready</div>
        <div class="mt-2 text-gray-700 text-lg" *ngIf="nextTitle">Next exercise: <span class="font-medium">{{ nextTitle }}</span></div>
      </div>
    </div>
  `,
  styles: [
    `@keyframes countdownPulse { 0% { transform: scale(0.9); opacity: 0.7; } 50% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.9); opacity: 0.7; } }`,
    `.countdown-anim { animation: countdownPulse 1s ease-in-out infinite; }`
  ]
})
export class PrepOverlayComponent {
  @Input() seconds = 5;
  @Input() nextTitle?: string;
}
