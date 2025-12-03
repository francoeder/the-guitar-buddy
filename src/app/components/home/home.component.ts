import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TrainingDialogComponent } from '../dialog/training-dialog.component';
import { Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { Training } from '../../models/training.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatSlideToggleModule],
  template: `
    <div class="p-6">
      <ng-container *ngIf="trainings().length > 0; else empty">
        <div class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <mat-card class="shadow hover:shadow-lg transition-shadow" *ngFor="let t of trainings()">
            <ng-container *ngIf="t.cover; else noCover">
              <img mat-card-image [src]="t.cover" alt="Training cover" class="h-40 object-cover" />
            </ng-container>
            <ng-template #noCover>
              <div class="h-40 bg-gradient-to-br from-indigo-200 to-indigo-400 flex items-center justify-center text-white text-xl font-semibold">{{ t.title }}</div>
            </ng-template>

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
              <div class="flex items-center gap-3">
                <button mat-raised-button color="primary" (click)="play(t)">
                  <mat-icon>play_arrow</mat-icon>
                  Play
                </button>
                <mat-slide-toggle [checked]="autoplay(t._id)" (change)="setAutoplay(t._id, $event.checked)">Autoplay</mat-slide-toggle>
              </div>
              <div class="space-x-2">
                <button mat-stroked-button (click)="edit(t)">
                  <mat-icon>edit</mat-icon>
                  Edit
                </button>
                <button mat-stroked-button color="warn" (click)="remove(t)">
                  <mat-icon>delete</mat-icon>
                  Delete
                </button>
              </div>
            </mat-card-actions>
          </mat-card>
        </div>
      </ng-container>
      <ng-template #empty>
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="text-lg text-gray-600 mb-4">No trainings created yet.</div>
          <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 transition text-white rounded" (click)="create()">Create first training</button>
        </div>
      </ng-template>

      <button mat-fab color="primary" class="fixed bottom-6 right-6" (click)="create()">
        <mat-icon>add</mat-icon>
      </button>
    </div>
  `
})
export class HomeComponent {
  private svc = inject(TrainingService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  trainings = computed(() => this.svc.getAll()());

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

  edit(t: Training) {
    this.openDialog({ ...t });
  }

  create() {
    const t: Training = { _id: crypto.randomUUID(), title: 'New Training', owner: '', active: true, cover: '', exercises: [] };
    this.openDialog(t);
  }

  remove(t: Training) {
    this.svc.delete(t._id);
  }

  private openDialog(training: Training) {
    const ref = this.dialog.open(TrainingDialogComponent, { data: training, width: '900px' });
    ref.afterClosed().subscribe(result => { if (result) this.svc.save(result as Training); });
  }
}
