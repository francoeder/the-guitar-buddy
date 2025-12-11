import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-4">
      <mat-card class="p-6 space-y-4">
        <h2 class="text-xl font-semibold">Dashboard</h2>
        <p>Email: {{ email() || '—' }}</p>
        <div>
          <button mat-stroked-button color="primary" class="mr-2" (click)="onLogout()">
            <mat-icon>logout</mat-icon>
            Logout
          </button>
        </div>
      </mat-card>
    </div>
  `
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = computed(() => this.auth.user()?.email ?? null);

  async onLogout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
