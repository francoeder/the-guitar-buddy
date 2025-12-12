import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4">
      <mat-card class="p-0 overflow-hidden rounded-2xl shadow-md w-[95vw] h-[85vh] md:w-[70vw] md:h-[70vh]">
        <div class="grid lg:grid-cols-2 h-full">
          <div class="login-left relative flex items-center justify-center h-full px-6 sm:px-8 py-4 sm:py-8 md:py-16 text-white bg-gradient-to-br from-[#0E3A59] to-[#1A73A8]">
            <div class="max-w-md w-full flex flex-col items-center text-center login-stack">
              <img src="assets/images/music-buddy-avatar.png" alt="Music Buddy" class="login-avatar" />
              <div class="login-title font-bold tracking-wide">Music Buddy</div>
              <div class="login-subtitle opacity-80">Practice smarter with your music training buddy.</div>
            </div>
          </div>
          <div class="flex items-center justify-center h-full p-6 sm:p-8 bg-white">
            <div class="w-full max-w-sm md:max-w-md">
              <button mat-raised-button color="primary" class="w-full login-button" (click)="onLogin()">
                <span class="w-full flex items-center justify-center gap-3">
                  <img src="assets/icons/google.svg" alt="Google" class="login-button-icon" />
                  <span class="login-button-label">{{ 'login.google' | translate }}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [
    `
    .login-left { overflow: hidden; }
    .login-stack { gap: clamp(0.5rem, 2.5vmin, 1rem); }
    .login-avatar { width: clamp(4rem, 22vmin, 10rem); height: clamp(4rem, 22vmin, 10rem); }
    .login-title { font-size: clamp(1.5rem, 8vmin, 3rem); }
    .login-subtitle { font-size: clamp(0.75rem, 3.2vmin, 1rem); }
    .login-button { padding-top: clamp(0.6rem, 2.4vmin, 0.9rem); padding-bottom: clamp(0.6rem, 2.4vmin, 0.9rem); }
    .login-button-icon { width: clamp(1.25rem, 4vmin, 1.8rem); height: clamp(1.25rem, 4vmin, 1.8rem); }
    .login-button-label { font-size: clamp(0.95rem, 3.4vmin, 1.15rem); font-weight: 600; }
    @media (max-width: 639px) and (orientation: portrait) {
      .login-left { padding-top: 1rem; padding-bottom: 1rem; }
      .login-stack { gap: clamp(1rem, 4.2vw, 1.5rem); }
      .login-avatar { width: clamp(7rem, 48vw, 13rem); height: clamp(7rem, 48vw, 13rem); }
      .login-title { font-size: clamp(2.4rem, 10vw, 3.2rem); }
      .login-subtitle { font-size: clamp(1.05rem, 4.8vw, 1.25rem); }
      .login-button-icon { width: clamp(1.4rem, 6vw, 2rem); height: clamp(1.4rem, 6vw, 2rem); }
      .login-button-label { font-size: clamp(1.05rem, 4.8vw, 1.25rem); }
    }
    `
  ]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  async onLogin() {
    await this.auth.loginWithGoogle();
    await this.router.navigateByUrl('/home');
  }
}
