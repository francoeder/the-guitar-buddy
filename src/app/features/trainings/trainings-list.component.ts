import { Component, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, ActivatedRoute } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { AuthService } from '../../core/services/auth.service';
import { Training } from '../../models/training.model';
import { ConfirmDialogComponent } from '../../components/dialog/confirm-dialog.component';
import { SharedTrainingDialogComponent } from '../../components/dialog/shared-training-dialog.component';
import { TrainingCardComponent } from '../../components/training-card/training-card.component';

@Component({
  selector: 'app-trainings-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatSlideToggleModule, MatTooltipModule, TrainingCardComponent],
  template: `
    <div class="p-4 md:p-6">
      @if (trainings().length > 0) {
        <div class="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          @for (t of trainings(); track t._id) {
            <app-training-card [training]="t" (delete)="remove($event)"></app-training-card>
          }
        </div>
      } @else {
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <div class="text-lg text-gray-600 mb-4">No trainings created yet.</div>
          <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 transition text-white rounded" (click)="create()">Create first training</button>
        </div>
      }

      <button mat-fab color="primary" class="fab-create" (click)="create()">
        <mat-icon>add</mat-icon>
      </button>
    </div>
  `,
  styles: [
    `.fab-create{position:fixed;right:1.5rem;bottom:1.5rem;z-index:1000;}`
  ]
})
export class TrainingsListComponent {
  private svc = inject(TrainingService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  trainings = computed(() => this.svc.getAll()());
  currentUser = computed(() => this.auth.user());
  
  private sharedIdToOpen = signal<string | null>(null);

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['shared']) {
        this.sharedIdToOpen.set(params['shared']);
      }
    });

    effect(() => {
      const id = this.sharedIdToOpen();
      const list = this.trainings();
      if (id && list.length > 0) {
        const t = list.find(x => x._id === id);
        if (t) {
          // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError if any
          setTimeout(() => {
            this.openSharedDetails(t);
            this.sharedIdToOpen.set(null);
            // Remove the query param from URL so it doesn't stay there
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { shared: null },
              queryParamsHandling: 'merge',
              replaceUrl: true
            });
          });
        }
      }
    });
  }

  openSharedDetails(t: Training) {
    this.dialog.open(SharedTrainingDialogComponent, {
      data: t,
      width: '500px'
    });
  }

  isShared(t: Training) {
    return t.ownerId && t.ownerId !== this.currentUser()?.uid;
  }

  create() {
    const id = crypto.randomUUID();
    this.router.navigate(['/training', id]);
  }

  remove(t: Training) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Training',
        message: `Are you sure you want to delete "${t.title}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      },
      width: '360px'
    });
    ref.afterClosed().subscribe(result => {
      if (result === true) this.svc.delete(t._id);
    });
  }
}

