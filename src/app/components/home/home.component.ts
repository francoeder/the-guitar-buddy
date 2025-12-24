import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TrainingService } from '../../services/training.service';
import { AuthService } from '../../core/services/auth.service';
import { Training } from '../../models/training.model';
import { ConfirmDialogComponent } from '../dialog/confirm-dialog.component';
import { TopRecentTrainingsComponent } from './top-recent-trainings.component';
import { TopPublicTrainingsComponent } from './top-public-trainings.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, TopRecentTrainingsComponent, TopPublicTrainingsComponent, TranslateModule],
  template: `
    <div class="p-6">
      <mat-card *ngIf="installAvailable() && isMobileView()" class="install-card">
        <mat-card-content>
          <div class="install-header">
            <div class="install-avatar"><mat-icon>install_mobile</mat-icon></div>
            <div class="install-text">
              <div class="install-title">{{ 'home.installTitle' | translate }}</div>
              <div class="install-subtitle">{{ 'home.installDescription' | translate }}</div>
            </div>
          </div>
        </mat-card-content>
        <mat-card-actions align="end" class="install-actions">
          <button mat-raised-button color="primary" (click)="install()">{{ 'home.install' | translate }}</button>
          <button mat-button (click)="dismissInstall()">{{ 'home.dismiss' | translate }}</button>
        </mat-card-actions>
      </mat-card>
      <app-top-recent-trainings></app-top-recent-trainings>
      <app-top-public-trainings class="mt-8 block"></app-top-public-trainings>
      <div class="mt-6 flex flex-wrap items-center gap-3 sm:gap-2 justify-center sm:justify-start">
        <button mat-raised-button color="primary" class="flex items-center gap-2" (click)="goToTrainings()">
          <mat-icon>library_music</mat-icon>
          {{ 'home.viewAllTrainings' | translate }}
        </button>
        <button mat-stroked-button class="flex items-center gap-2" (click)="create()">
          <mat-icon>add</mat-icon>
          {{ 'home.createNewTraining' | translate }}
        </button>
      </div>
    </div>
  `
  ,
  styles: [
    `.fab-create{position:fixed;right:1.5rem;bottom:1.5rem;z-index:1000;}
    .install-card{margin-bottom:12px;}
    .install-card .mat-card-content{padding:12px 16px 0;}
    .install-header{display:flex;align-items:center;gap:12px;}
    .install-avatar{width:40px;height:40px;border-radius:50%;background:var(--mat-sys-primary-container, #e3f2fd);display:flex;align-items:center;justify-content:center;}
    .install-avatar mat-icon{color:var(--mat-sys-on-primary-container, #1976d2);font-size:24px;line-height:24px;}
    .install-text{display:flex;flex-direction:column;}
    .install-title{font-size:16px;font-weight:500;margin-bottom:2px;}
    .install-subtitle{font-size:14px;color:var(--mat-sys-on-surface-variant, #475569);} 
    .install-actions{padding:8px 16px 16px; display:flex; justify-content:flex-end; gap:8px;}
    `
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  private svc = inject(TrainingService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private installEvent: any = null;
  installAvailable = signal(false);
  isMobileView = signal(false);

  trainings = computed(() => this.svc.getAll()());
  goToTrainings() {
    this.router.navigate(['/trainings']);
  }

  create() {
    const id = crypto.randomUUID();
    this.router.navigate(['/training', id]);
  }

  remove(t: Training) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.translate.instant('dialogs.deleteTraining.title'),
        message: this.translate.instant('dialogs.deleteTraining.message', { title: t.title }),
        confirmText: this.translate.instant('dialogs.confirm.delete'),
        cancelText: this.translate.instant('dialogs.confirm.cancel')
      },
      width: '360px'
    });
    ref.afterClosed().subscribe(result => {
      if (result === true) this.svc.delete(t._id);
    });
  }

  ngOnInit() {
    const mm = window.matchMedia('(max-width: 767px)');
    const updateMobile = () => this.isMobileView.set(mm.matches);
    updateMobile();
    window.addEventListener('resize', updateMobile);
    this.installEvent = (window as any).__deferredInstallPrompt || null;
    this.installAvailable.set(!!this.installEvent);
    window.addEventListener('deferredpromptchanged', () => {
      this.installEvent = (window as any).__deferredInstallPrompt || null;
      this.installAvailable.set(!!this.installEvent);
    });
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => {});
  }

  async install() {
    const e = this.installEvent;
    if (!e) return;
    await e.prompt();
    await e.userChoice;
    this.installAvailable.set(false);
    this.installEvent = null;
  }

  dismissInstall() {
    this.installAvailable.set(false);
  }
}
