import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Training } from '../../models/training.model';
import { MatDialog } from '@angular/material/dialog';
import { SharedTrainingDialogComponent } from '../dialog/shared-training-dialog.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-training-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatTooltipModule],
  template: `
    <mat-card class="shadow hover:shadow-lg transition-shadow relative">
      @if (training.cover) {
        <img mat-card-image [src]="training.cover" alt="Training cover" class="h-40 object-cover" />
      } @else {
        <div class="h-40 bg-gradient-to-br from-indigo-200 to-indigo-400 flex items-center justify-center text-white text-xl font-semibold">{{ training.title }}</div>
      }
      <div class="px-4 pt-3">
        <div class="flex items-center justify-between gap-2">
          <div class="flex-1 min-w-0 text-base font-semibold leading-tight truncate" [matTooltip]="training.title">{{ training.title }}</div>
          @if (isShared) {
            <div class="flex items-center -mr-2 shrink-0">
              <button mat-icon-button (click)="openSharedDetails()" matTooltip="Shared with you" class="flex items-center justify-center">
                <mat-icon class="text-[#1A73A8]">people</mat-icon>
              </button>
            </div>
          } @else if (showManageActions) {
            <div class="flex items-center -mr-2 shrink-0">
              <button mat-icon-button (click)="onEdit()" matTooltip="Edit" class="flex items-center justify-center">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="onDelete()" matTooltip="Delete" class="flex items-center justify-center">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
        </div>
        <div class="text-sm text-gray-500 mt-1">Exercises: {{ training.exercises.length }}</div>
      </div>
      <mat-card-actions class="px-4 py-3 mt-1 flex flex-wrap items-center justify-end gap-4">
        <mat-slide-toggle [checked]="autoplay()" (change)="setAutoplay($event.checked)">Autoplay</mat-slide-toggle>
        <button mat-flat-button color="primary" (click)="play()">
          <mat-icon>play_arrow</mat-icon>
          Start Training
        </button>
      </mat-card-actions>
    </mat-card>
  `
})
export class TrainingCardComponent {
  @Input({ required: true }) training!: Training;
  @Input() showManageActions = true;
  @Output() delete = new EventEmitter<Training>();

  private router = inject(Router);
  private dialog = inject(MatDialog);
  private auth = inject(AuthService);

  autoplay = signal(false);

  get isShared(): boolean {
    const user = this.auth.user();
    return !!(this.training.ownerId && this.training.ownerId !== user?.uid);
  }

  setAutoplay(value: boolean) {
    this.autoplay.set(value);
  }

  play() {
    const ap = this.autoplay() ? '1' : '0';
    this.router.navigate(['/run', this.training._id], { queryParams: { autoplay: ap } });
  }

  onEdit() {
    this.router.navigate(['/training', this.training._id]);
  }

  onDelete() {
    this.delete.emit(this.training);
  }

  openSharedDetails() {
    this.dialog.open(SharedTrainingDialogComponent, {
      data: this.training,
      width: '500px'
    });
  }
}
