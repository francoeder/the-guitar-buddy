import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { UsageService } from '../../services/usage.service';
import { AuthService } from '../../core/services/auth.service';
import { Training } from '../../models/training.model';
import { TranslateModule } from '@ngx-translate/core';
import { TrainingCardComponent } from '../training-card/training-card.component';

@Component({
  selector: 'app-top-recent-trainings',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatTooltipModule, TranslateModule, TrainingCardComponent],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">{{ 'home.lastTrainings' | translate }}</h2>
      @if (trainings().length > 0) {
        <div class="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          @for (t of trainings(); track t._id) {
            <app-training-card [training]="t" [showManageActions]="true"></app-training-card>
          }
        </div>
      } @else {
        <div class="text-gray-600">{{ 'home.noRecentRuns' | translate }}</div>
      }
    </div>
  `
})
export class TopRecentTrainingsComponent {
  private trainingsSvc = inject(TrainingService);
  private usageSvc = inject(UsageService);
  private auth = inject(AuthService);

  ids = this.usageSvc.getRecentIds();
  trainings = computed(() => {
    const all = this.trainingsSvc.getAll()();
    const ids = this.ids();
    return ids.map(id => all.find(t => t._id === id)).filter(Boolean) as Training[];
  });
  currentUser = computed(() => this.auth.user());
}
