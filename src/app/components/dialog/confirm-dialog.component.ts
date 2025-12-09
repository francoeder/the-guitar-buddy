import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-4">
      <h2 class="text-lg font-semibold mb-2">{{ data.title || 'Confirm' }}</h2>
      <p class="text-sm text-gray-700 mb-4">{{ data.message }}</p>
      <div class="flex justify-end gap-2">
        <button mat-stroked-button (click)="cancel()">{{ data.cancelText || 'Cancel' }}</button>
        <button mat-raised-button color="warn" (click)="confirm()">
          <mat-icon>delete</mat-icon>
          {{ data.confirmText || 'Delete' }}
        </button>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  private dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  data = inject<{ title?: string; message: string; confirmText?: string; cancelText?: string }>(MAT_DIALOG_DATA);

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}

