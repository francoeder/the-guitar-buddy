import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatMenuModule],
  template: `
    <button mat-button [matMenuTriggerFor]="languageMenu" aria-label="Language" class="p-0 h-auto min-w-0">
      <img [src]="flagIcon()" alt="lang" class="w-6 h-6 md:w-8 md:h-8 rounded-sm" />
    </button>
    <mat-menu #languageMenu="matMenu">
      <button mat-menu-item (click)="setLanguage('en-US')">
        <img src="assets/flags/us.png" alt="English" class="w-6 h-6 mr-2 inline-block" /> English
      </button>
      <button mat-menu-item (click)="setLanguage('pt-BR')">
        <img src="assets/flags/br.png" alt="Português" class="w-6 h-6 mr-2 inline-block" /> Português
      </button>
    </mat-menu>
  `
})
export class LanguageSwitcherComponent {
  private translate = inject(TranslateService);

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
}

