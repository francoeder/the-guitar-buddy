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
        <div class="grid md:grid-cols-2 h-full">
          <div class="relative flex items-center justify-center h-full px-8 py-10 md:py-16 text-white bg-gradient-to-br from-[#0E3A59] to-[#1A73A8]">
            <div class="absolute top-6 left-6 flex items-center gap-2">
              <img src="assets/images/music-buddy-avatar.png" alt="Guitar Buddy" class="w-8 h-8 rounded" />
              <span class="font-medium">Guitar Buddy</span>
            </div>
            <div class="max-w-md text-center">
              <div class="text-sm opacity-80">Nice to see you again</div>
              <div class="mt-2 text-4xl md:text-5xl font-bold tracking-wide">WELCOME BACK</div>
              <div class="mt-4 text-sm opacity-80">Practice smarter with your guitar training buddy.</div>
            </div>
          </div>
          <div class="flex items-center justify-center h-full p-8 bg-white">
            <div class="w-full max-w-sm md:max-w-md">
              <button mat-raised-button color="primary" class="w-full" (click)="onLogin()">
                <span class="w-full flex items-center justify-center gap-2">
                  <img src="assets/icons/google.svg" alt="Google" class="w-5 h-5" />
                  <span>{{ 'login.google' | translate }}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
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
