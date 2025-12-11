import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule, TranslateModule],
  template: `
    <div class="min-h-screen flex flex-col">
      <mat-toolbar *ngIf="!isRunnerRoute()" color="primary" class="sticky top-0 z-10">
        <img src="assets/images/music-buddy-avatar.png" alt="Guitar Buddy" class="w-8 h-8 mr-2 rounded" />
        <span class="font-semibold app-title">{{ 'app.title' | translate }}</span>
        <button mat-icon-button class="ml-1 mobile-only" [matMenuTriggerFor]="mobileMenu" aria-label="Menu">
          <mat-icon>menu</mat-icon>
        </button>
        <button mat-button class="ml-3 desktop-only" routerLink="/home"><mat-icon>home</mat-icon> {{ 'nav.home' | translate }}</button>
        <button mat-button class="ml-1 desktop-only" [matMenuTriggerFor]="trainingsMenu"><mat-icon>library_music</mat-icon> {{ 'nav.trainings' | translate }}</button>
        <span class="flex-1"></span>
        <mat-menu #trainingsMenu="matMenu">
          <button mat-menu-item routerLink="/trainings">
            <mat-icon>list</mat-icon>
            {{ 'nav.availableTrainings' | translate }}
          </button>
          <button mat-menu-item (click)="createTraining()">
            <mat-icon>add</mat-icon>
            {{ 'nav.createTraining' | translate }}
          </button>
        </mat-menu>
        <mat-menu #mobileMenu="matMenu">
          <button mat-menu-item routerLink="/home"><mat-icon>home</mat-icon> {{ 'nav.home' | translate }}</button>
          <button mat-menu-item routerLink="/trainings"><mat-icon>list</mat-icon> {{ 'nav.availableTrainings' | translate }}</button>
          <button mat-menu-item (click)="createTraining()"><mat-icon>add</mat-icon> {{ 'nav.createTraining' | translate }}</button>
        </mat-menu>
        <div class="flex items-center gap-2">
          <button mat-button [matMenuTriggerFor]="languageMenu" aria-label="Language" class="p-0 h-auto min-w-0 desktop-only">
            <img [src]="flagIcon()" alt="lang" class="w-8 h-8 rounded-sm" />
          </button>
          <button mat-button [matMenuTriggerFor]="languageMenu" aria-label="Language" class="p-0 h-auto min-w-0 mobile-only">
            <img [src]="flagIcon()" alt="lang" class="w-6 h-6 rounded-sm" />
          </button>
          <mat-menu #languageMenu="matMenu">
            <button mat-menu-item (click)="setLanguage('en-US')">
              <img src="assets/flags/us.png" alt="English" class="w-6 h-6 mr-2 inline-block" /> English
            </button>
            <button mat-menu-item (click)="setLanguage('pt-BR')">
              <img src="assets/flags/br.png" alt="Português" class="w-6 h-6 mr-2 inline-block" /> Português
            </button>
          </mat-menu>
          <button mat-icon-button [matMenuTriggerFor]="notificationsMenu" aria-label="Notifications">
            <mat-icon>notifications</mat-icon>
          </button>
          <button mat-button [matMenuTriggerFor]="userMenu" aria-label="User" class="p-0 h-auto min-w-0 desktop-only">
            <div class="relative inline-block">
              <img *ngIf="photoUrl(); else placeholderUser" [src]="photoUrl()" alt="avatar" class="w-10 h-10 rounded-full" />
              <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white text-black shadow flex items-center justify-center border border-gray-300">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="translate-y-[0.5px]">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </div>
            </div>
            <ng-template #placeholderUser>
              <div class="relative inline-block">
                <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                  <mat-icon>person</mat-icon>
                </div>
                <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white text-black shadow flex items-center justify-center border border-gray-300">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="translate-y-[0.5px]">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </div>
              </div>
            </ng-template>
          </button>
          <button mat-button [matMenuTriggerFor]="userMenu" aria-label="User" class="p-0 h-auto min-w-0 mobile-only">
            <div class="relative inline-block">
              <img *ngIf="photoUrl(); else placeholderUserMobile" [src]="photoUrl()" alt="avatar" class="w-8 h-8 rounded-full" />
              <ng-template #placeholderUserMobile>
                <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <mat-icon>person</mat-icon>
                </div>
              </ng-template>
            </div>
          </button>
        </div>
        <mat-menu #userMenu="matMenu" [panelClass]="'user-menu-panel'">
          <div class="p-3 w-64" [style.maxHeight.px]="280">
            <div class="flex items-center gap-3">
              <img *ngIf="photoUrl(); else placeholder" [src]="photoUrl()" alt="avatar" class="w-10 h-10 rounded-full border" />
              <ng-template #placeholder>
                <mat-icon>person</mat-icon>
              </ng-template>
              <div class="flex flex-col">
                <span class="font-medium">{{ displayName() || ('user.label' | translate) }}</span>
                <span class="text-sm text-gray-600">{{ email() || '—' }}</span>
              </div>
            </div>
            <div class="mt-3 flex justify-end">
              <button mat-stroked-button color="primary" (click)="onLogout()">
                <mat-icon>logout</mat-icon>
                {{ 'user.logout' | translate }}
              </button>
            </div>
          </div>
        </mat-menu>
        <mat-menu #notificationsMenu="matMenu">
          <div class="p-3 w-64">
            <div class="text-sm text-gray-600">{{ 'notifications.none' | translate }}</div>
          </div>
        </mat-menu>
      </mat-toolbar>
      <div class="flex-1">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [
    `
    .desktop-only { display: none; }
    .mobile-only { display: inline-flex; }
    @media (min-width: 640px) {
      .desktop-only { display: inline-flex !important; }
      .mobile-only { display: none !important; }
    }
    @media (max-width: 639px) and (orientation: portrait) {
      .app-title { display: none; }
    }
    `
  ]
})
export class AppComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  displayName = () => this.auth.user()?.displayName ?? null;
  email = () => this.auth.user()?.email ?? null;
  photoUrl = () => this.auth.user()?.photoURL ?? null;
  firstName = () => {
    const dn = this.displayName();
    if (dn) return dn.split(' ')[0];
    const em = this.email();
    if (em) return em.split('@')[0];
    return null;
  };
  constructor() {
    this.translate.addLangs(['en-US', 'pt-BR']);
    this.translate.setDefaultLang('en-US');
    const saved = localStorage.getItem('lang') || 'en-US';
    this.translate.use(saved);
  }
  currentLang() {
    return this.translate.currentLang || 'en-US';
  }
  flagIcon() {
    return this.currentLang() === 'pt-BR' ? 'assets/flags/br.png' : 'assets/flags/us.png';
  }
  setLanguage(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }
  async onLogout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
  createTraining() {
    const id = 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    this.router.navigate(['/training', id]);
  }
  isRunnerRoute() {
    const url = this.router.url;
    return url.includes('/run/') || url.startsWith('/login');
  }
}
