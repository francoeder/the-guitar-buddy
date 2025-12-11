import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="min-h-screen flex flex-col">
      <mat-toolbar *ngIf="!isRunnerRoute()" color="primary" class="sticky top-0 z-10">
        <span class="font-semibold">Guitar Buddy</span>
        <span class="flex-1"></span>
        <button mat-button routerLink="/home"><mat-icon>home</mat-icon> Home</button>
        <button mat-icon-button [matMenuTriggerFor]="userMenu" aria-label="User">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu" [panelClass]="'user-menu-panel'">
          <div class="p-3 w-64" [style.maxHeight.px]="280">
            <div class="flex items-center gap-3">
              <img *ngIf="photoUrl(); else placeholder" [src]="photoUrl()" alt="avatar" class="w-10 h-10 rounded-full border" />
              <ng-template #placeholder>
                <mat-icon>person</mat-icon>
              </ng-template>
              <div class="flex flex-col">
                <span class="font-medium">{{ displayName() || 'User' }}</span>
                <span class="text-sm text-gray-600">{{ email() || '—' }}</span>
              </div>
            </div>
            <div class="mt-3 flex justify-end">
              <button mat-stroked-button color="primary" (click)="onLogout()">
                <mat-icon>logout</mat-icon>
                Logout
              </button>
            </div>
          </div>
        </mat-menu>
      </mat-toolbar>
      <div class="flex-1">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class AppComponent {
  private router = inject(Router);
  private auth = inject(AuthService);
  displayName = () => this.auth.user()?.displayName ?? null;
  email = () => this.auth.user()?.email ?? null;
  photoUrl = () => this.auth.user()?.photoURL ?? null;
  async onLogout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
  isRunnerRoute() {
    const url = this.router.url;
    return url.includes('/run/') || url.startsWith('/login');
  }
}
