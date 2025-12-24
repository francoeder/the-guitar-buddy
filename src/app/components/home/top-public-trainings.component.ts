import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { TrainingCardComponent } from '../training-card/training-card.component';

@Component({
  selector: 'app-top-public-trainings',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatTooltipModule, TranslateModule, TrainingCardComponent],
  template: `
    @if (trainings().length > 0) {
      <div>
        <h2 class="text-xl font-semibold mb-4">{{ 'home.lastPublicTrainings' | translate }}</h2>
        <div class="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          @for (t of trainings(); track t._id) {
            <app-training-card [training]="t" [showManageActions]="true"></app-training-card>
          }
        </div>
      </div>
    }
  `
})
export class TopPublicTrainingsComponent {
  private trainingsSvc = inject(TrainingService);
  private auth = inject(AuthService);

  trainings = this.trainingsSvc.getPublicTrainings();
  currentUser = computed(() => this.auth.user());
}
