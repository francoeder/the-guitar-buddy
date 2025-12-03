import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <div class="min-h-screen flex flex-col">
      <mat-toolbar *ngIf="!isRunnerRoute()" color="primary" class="sticky top-0 z-10">
        <span class="font-semibold">Guitar Buddy</span>
        <span class="flex-1"></span>
        <button mat-button routerLink="/home"><mat-icon>home</mat-icon> Home</button>
      </mat-toolbar>
      <div class="flex-1">
        <router-outlet></router-outlet>
      </div>
    </div>
  `
})
export class AppComponent {
  private router = inject(Router);
  isRunnerRoute() {
    return this.router.url.includes('/run/');
  }
}
