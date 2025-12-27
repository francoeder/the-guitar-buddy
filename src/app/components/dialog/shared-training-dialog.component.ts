import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Training } from '../../models/training.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-shared-training-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-indigo-600">share</mat-icon>
      {{ 'dialogs.sharedTraining.title' | translate }}
    </h2>
    <mat-dialog-content>
      <div class="flex flex-col gap-4">
        <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
          <p class="text-indigo-900 font-medium" [innerHTML]="messageKey | translate:{owner: ownerDisplay}">
          </p>
        </div>

        <div class="flex flex-col gap-3">
          @if (data.cover) {
            <img [src]="data.cover" alt="Training cover" class="w-full h-48 object-cover rounded-lg shadow-sm" />
          } @else {
            <div class="w-full h-32 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-sm">
              {{ data.title }}
            </div>
          }

          <div>
            <h3 class="text-xl font-bold text-gray-800">{{ data.title }}</h3>
            <div class="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span class="flex items-center gap-1">
                <mat-icon class="!w-4 !h-4 text-[16px] leading-none">fitness_center</mat-icon>
                {{ data.exercises.length }} {{ 'common.exercises' | translate }}
              </span>
              <span class="flex items-center gap-1" [class.text-green-600]="data.active" [class.text-red-500]="!data.active">
                <mat-icon class="!w-4 !h-4 text-[16px] leading-none">{{ data.active ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ data.active ? ('common.active' | translate) : ('common.inactive' | translate) }}
              </span>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-3 mt-1">
            <h4 class="text-sm font-semibold text-gray-700 mb-2">{{ 'dialogs.sharedTraining.preview' | translate }}</h4>
            <div class="max-h-40 overflow-y-auto pr-2 space-y-2">
              @for (ex of data.exercises; track ex.id) {
                <div class="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span class="font-medium truncate">{{ ex.title }}</span>
                  <span class="text-gray-500 text-xs whitespace-nowrap">{{ ex.durationMinutes }}m {{ ex.durationSeconds }}s</span>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="gap-2">
      <button mat-stroked-button mat-dialog-close>{{ 'common.close' | translate }}</button>
      <button mat-flat-button color="primary" (click)="play()">
        <mat-icon>play_arrow</mat-icon>
        {{ 'common.startTraining' | translate }}
      </button>
    </mat-dialog-actions>
  `
})
export class SharedTrainingDialogComponent {
  data = inject<Training>(MAT_DIALOG_DATA);
  private router = inject(Router);
  private dialogRef = inject(MatDialogRef<SharedTrainingDialogComponent>);
  private translate = inject(TranslateService);

  get messageKey(): string {
    return this.data.isPublic 
      ? 'dialogs.sharedTraining.messagePublic' 
      : 'dialogs.sharedTraining.message';
  }

  get ownerDisplay(): string {
    const name = this.data.ownerName;
    const email = this.data.owner;
    
    if (this.data.isPublic && name) {
      return name;
    }
    
    if (name && email) {
      return `${name} (${email})`;
    }
    
    return name || email || this.translate.instant('common.unknownUser');
  }

  play() {
    this.dialogRef.close();
    this.router.navigate(['/run', this.data._id]);
  }
}
