import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Theme, ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-global-header',
  standalone: true,
  imports: [],
  template: `
    <header class="global-header">
      <div class="header-brand">
        <div class="brand-logo-wrap">
          <img [src]="logoSrc()" alt="BeyondAI" class="brand-logo" />
        </div>
        <span class="brand-name">BeyondAI Research Group</span>
      </div>
      <div class="header-controls">
        <div class="toggle-group" aria-label="Theme">
          <button
            class="toggle-group__btn"
            type="button"
            [class.toggle-group__btn--active]="currentTheme() === 'dark'"
            (click)="setTheme('dark')"
            aria-label="Dark theme"
            title="Tamna tema / Dark theme"
          >☾</button>
          <button
            class="toggle-group__btn"
            type="button"
            [class.toggle-group__btn--active]="currentTheme() === 'light'"
            (click)="setTheme('light')"
            aria-label="Light theme"
            title="Svetla tema / Light theme"
          >☀</button>
        </div>
        <!-- Language toggle disabled: the language is chosen once on the login page and locked.
             Re-enable by uncommenting if needed. -->
        <!--
        <div class="toggle-group" aria-label="Language">
          <button
            class="toggle-group__btn"
            type="button"
            [class.toggle-group__btn--active]="currentLang() === 'sr'"
            (click)="setLang('sr')"
            aria-label="Srpski"
          >SR</button>
          <button
            class="toggle-group__btn"
            type="button"
            [class.toggle-group__btn--active]="currentLang() === 'en'"
            (click)="setLang('en')"
            aria-label="English"
          >EN</button>
        </div>
        -->
      </div>
    </header>
  `,
  styles: [`
    .global-header {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      background: var(--color-header-bg);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--color-border);
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-logo-wrap {
      width: 44px;
      height: 44px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--color-header-bg);
    }

    .brand-logo {
      width: 44px;
      height: 44px;
      object-fit: contain;
      display: block;
      filter: drop-shadow(0 0 6px rgba(var(--color-accent-rgb), 0.45)) brightness(1.05);
    }

    .brand-name {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: var(--header-text);
      letter-spacing: 0.02em;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .toggle-group {
      display: flex;
      border: 1px solid var(--header-ctrl-border);
      border-radius: 6px;
      overflow: hidden;
    }

    .toggle-group__btn {
      padding: 0.3rem 0.65rem;
      background: transparent;
      color: var(--header-ctrl-color);
      border: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 0.8rem;
      cursor: pointer;
      transition: background 150ms ease, color 150ms ease;
      line-height: 1.4;

      &:not(:last-child) {
        border-right: 1px solid var(--header-ctrl-border);
      }

      &--active {
        background: var(--header-ctrl-active-bg);
        color: var(--header-ctrl-active-color);
        font-weight: 600;
        cursor: default;
      }

      &:not(.toggle-group__btn--active):hover {
        color: var(--header-ctrl-hover-color);
      }
    }
  `],
})
export class GlobalHeaderComponent implements OnInit {
  private translate = inject(TranslateService);
  private themeService = inject(ThemeService);

  readonly currentLang = signal('sr');
  readonly currentTheme = this.themeService.theme;
  readonly logoSrc = computed(() =>
    this.currentTheme() === 'light' ? 'assets/beyondai-favicon-light.svg' : 'assets/beyondai-favicon.svg'
  );

  ngOnInit(): void {
    this.currentLang.set(this.translate.currentLang || 'sr');
  }

  setLang(lang: string): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    try { localStorage.setItem('demographicsapp-lang', lang); } catch { /* ignore */ }
  }

  setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }
}