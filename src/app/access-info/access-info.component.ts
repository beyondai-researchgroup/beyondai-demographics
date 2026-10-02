import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Default landing page as of Phase C of the consent/token project: real participants only ever
 * reach this app via the emailed magic link (`/link/:token`), issued after they complete the
 * Consent app's flow — this page is what anyone hitting the bare root URL sees instead of a
 * login form. `/login` still exists in the codebase for dev/testing but is no longer linked
 * from anywhere.
 */
@Component({
  selector: 'app-access-info',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="page-centered">
      <div class="card access-info-card">
        <h1 class="access-info-title">{{ 'ACCESS_INFO.TITLE' | translate }}</h1>
        <p class="access-info-text">{{ 'ACCESS_INFO.TEXT' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .access-info-card {
      max-width: 460px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .access-info-title {
      font-size: 22px;
      font-weight: 700;
    }
    .access-info-text {
      color: var(--color-muted);
      margin: 0;
      line-height: 1.6;
    }
  `],
})
export class AccessInfoComponent {}
