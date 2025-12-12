import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { UsageService } from '../../services/usage.service';
import { Training } from '../../models/training.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-top-recent-trainings',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSlideToggleModule, TranslateModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">{{ 'home.lastTrainings' | translate }}</h2>
      @if (trainings().length > 0) {
        <div class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          @for (t of trainings(); track t._id) {
            <mat-card class="shadow hover:shadow-lg transition-shadow">
              @if (t.cover) {
                <img mat-card-image [src]="t.cover" alt="Training cover" class="h-40 object-cover" />
              } @else {
                <div class="h-40 bg-gradient-to-br from-indigo-200 to-indigo-400 flex items-center justify-center text-white text-xl font-semibold">{{ t.title }}</div>
              }
              <div class="px-4 pt-3">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="text-base font-semibold leading-tight">{{ t.title }}</div>
                    <div class="text-sm text-gray-500">Exercises: {{ t.exercises.length }}</div>
                  </div>
                  <div class="text-xs px-2 py-1 rounded-full" [class.bg-green-100]="t.active" [class.text-green-700]="t.active" [class.bg-red-100]="!t.active" [class.text-red-700]="!t.active">{{ t.active ? 'Active' : 'Inactive' }}</div>
                </div>
              </div>
              <mat-card-actions class="px-4 py-3 mt-1 flex items-center justify-between">
                <div class="flex items-center gap-3 flex-wrap">
                  <button mat-raised-button color="primary" (click)="play(t)">
                    <mat-icon>play_arrow</mat-icon>
                    Play
                  </button>
                  <mat-slide-toggle [checked]="autoplay(t._id)" (change)="setAutoplay(t._id, $event.checked)">Autoplay</mat-slide-toggle>
                </div>
              </mat-card-actions>
            </mat-card>
          }
        </div>
      } @else {
        <div class="text-gray-600">{{ 'home.noRecentRuns' | translate }}</div>
      }
    </div>
  `
})
export class TopRecentTrainingsComponent {
  private router = inject(Router);
  private trainingsSvc = inject(TrainingService);
  private usageSvc = inject(UsageService);

  ids = this.usageSvc.getRecentIds();
  trainings = computed(() => {
    const all = this.trainingsSvc.getAll()();
    const ids = this.ids();
    return ids.map(id => all.find(t => t._id === id)).filter(Boolean) as Training[];
  });

  autoplayById = signal<Record<string, boolean>>({});

  autoplay(id: string) {
    return !!this.autoplayById()[id];
  }

  setAutoplay(id: string, value: boolean) {
    const map = { ...this.autoplayById() } as Record<string, boolean>;
    map[id] = value;
    this.autoplayById.set(map);
  }

  play(t: Training) {
    const ap = this.autoplay(t._id) ? '1' : '0';
    this.router.navigate(['/run', t._id], { queryParams: { autoplay: ap } });
  }

  edit(t: Training) {}
  remove(t: Training) {}
}
