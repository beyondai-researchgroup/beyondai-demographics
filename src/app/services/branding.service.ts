import { Injectable, computed, signal } from '@angular/core';

const KEY = 'brand-visible';
/** What stands in the browser tab when the research hides the BeyondAI branding. */
export const NEUTRAL_TITLE = 'Empirical Software Engineering Platform';
const NEUTRAL_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23888'/%3E%3C/svg%3E";

/**
 * Whether the BeyondAI logo / name is shown to this participant (Research.ShowBeyondAiBranding, set by the researcher).
 * The link / login answer carries the flag; `set()` is called with it. Until it is known, a participant link page shows
 * NOTHING (so the brand never flashes for a research that hid it); any other page (no research context) shows the brand.
 * Kept in sessionStorage so a reload renders the right thing at once. Identical copy in every participant app.
 */
@Injectable({ providedIn: 'root' })
export class BrandingService {
  private readonly shown = signal<boolean | null>(this.read());
  /** true = show the logo / brand name. */
  readonly visible = computed(() => {
    const v = this.shown();
    return v !== null ? v : !this.pendingResolve();
  });
  private readonly originalTitle = typeof document !== 'undefined' ? document.title : '';
  private observer: MutationObserver | null = null;

  constructor() {
    this.apply(this.visible());
  }

  set(show: boolean): void {
    this.shown.set(show);
    try { sessionStorage.setItem(KEY, show ? '1' : '0'); } catch { /* ignore */ }
    this.apply(show);
  }

  private read(): boolean | null {
    try {
      const v = sessionStorage.getItem(KEY);
      return v === '1' ? true : v === '0' ? false : null;
    } catch {
      return null;
    }
  }

  /** On a participant link page the answer that carries the flag has not arrived yet. */
  private pendingResolve(): boolean {
    return typeof window !== 'undefined' && /^\/link\//.test(window.location.pathname + window.location.search);
  }

  private apply(show: boolean): void {
    if (typeof document === 'undefined') return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!show) {
      document.title = NEUTRAL_TITLE;
      if (link) {
        link.setAttribute('href', NEUTRAL_FAVICON);
        // The theme service rewrites the icon on every theme change: put the neutral one back.
        this.observer?.disconnect();
        this.observer = new MutationObserver(() => {
          if (link.getAttribute('href') !== NEUTRAL_FAVICON) link.setAttribute('href', NEUTRAL_FAVICON);
        });
        this.observer.observe(link, { attributes: true, attributeFilter: ['href'] });
      }
    } else {
      this.observer?.disconnect();
      this.observer = null;
      if (this.originalTitle) document.title = this.originalTitle;
      if (link && link.getAttribute('href') === NEUTRAL_FAVICON) {
        link.setAttribute('href', document.documentElement.getAttribute('data-theme') === 'light' ? 'assets/beyondai-favicon-light.svg' : 'assets/beyondai-favicon.svg');
      }
    }
  }
}
