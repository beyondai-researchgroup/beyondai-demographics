import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

// Participants start on the light theme; -v2 so a choice stored before that default existed is not carried over.
const STORAGE_KEY = 'taskapp-theme-v2';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly theme = signal<Theme>(this.readInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  private readInitialTheme(): Theme {
    if (!this.isBrowser) return 'light';
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  }

  private applyTheme(theme: Theme): void {
    if (!this.isBrowser) return;
    this.document.documentElement.setAttribute('data-theme', theme);
    const favicon = this.document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = theme === 'light' ? 'assets/beyondai-favicon-light.svg' : 'assets/beyondai-favicon.svg';
    }
  }
}