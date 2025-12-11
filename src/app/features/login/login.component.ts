import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="flex flex-col justify-center items-center min-h-screen p-4">
      <img
        src="assets/images/music-buddy-avatar.png"
        alt="Music Buddy Avatar"
        class="mx-auto mb-6 w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain"
      />
      <mat-card class="w-full max-w-md p-6">
        <h2 class="text-xl font-semibold mb-4">Sign In</h2>
        <button mat-raised-button color="primary" class="w-full flex items-center gap-2" (click)="onLogin()">
          <mat-icon>login</mat-icon>
          Sign in with Google
        </button>
      </mat-card>
    </div>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  async onLogin() {
    await this.auth.loginWithGoogle();
    await this.router.navigateByUrl('/home');
  }
}
