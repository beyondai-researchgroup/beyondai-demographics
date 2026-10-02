import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { StateService } from '../services/state.service';
import { DatabaseService } from '../services/database.service';

type LinkStatus = 'loading' | 'already' | 'error';
type LinkErrorCode = 'NOT_FOUND' | 'EXPIRED' | 'NOT_ACTIVE' | 'SERVER_ERROR';

/**
 * Landing page for the emailed magic-link (`/link/:token`, issued by the Consent app or
 * admin-dashboard's regenerate-links, same SurveyAccessToken mechanism as REI-40/Big Five/
 * Task App — SurveyType='DEMOGRAPHIC'). On a valid, unexpired, not-yet-submitted token this
 * resolves the research's currently-configured demographic question set live (not baked into the
 * token — an admin editing questions takes effect on the same link immediately, same as REI-40's
 * Rei40Variant resolution) and routes to `/form`. Anything else shows a translated explanation
 * instead.
 */
@Component({
  selector: 'app-link-access',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="page-centered">
      <div class="card link-card">
        @switch (status()) {
          @case ('loading') {
            <p class="link-text">{{ 'LINK.LOADING' | translate }}</p>
          }
          @case ('already') {
            <span class="link-icon" aria-hidden="true">✓</span>
            <h1 class="link-title">{{ 'LINK.ALREADY_TITLE' | translate }}</h1>
            <p class="link-text">{{ 'LINK.ALREADY_TEXT' | translate }}</p>
          }
          @case ('error') {
            <h1 class="link-title">{{ 'LINK.ERROR_TITLE' | translate }}</h1>
            @switch (errorCode()) {
              @case ('EXPIRED') {
                <p class="link-text">{{ 'LINK.ERROR_EXPIRED' | translate }}</p>
              }
              @case ('NOT_FOUND') {
                <p class="link-text">{{ 'LINK.ERROR_NOT_FOUND' | translate }}</p>
              }
              @case ('NOT_ACTIVE') {
                <p class="link-text">{{ 'LINK.ERROR_NOT_ACTIVE' | translate }}</p>
              }
              @default {
                <p class="link-text">{{ 'LINK.ERROR_SERVER' | translate }}</p>
              }
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .link-card {
      max-width: 460px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .link-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(var(--color-accent-rgb), 0.15);
      color: var(--color-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      margin-bottom: 8px;
    }
    .link-title {
      font-size: 22px;
      font-weight: 700;
    }
    .link-text {
      color: var(--color-muted);
      margin: 0;
      line-height: 1.6;
    }
  `],
})
export class LinkAccessComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private db = inject(DatabaseService);
  private state = inject(StateService);

  readonly status = signal<LinkStatus>('loading');
  readonly errorCode = signal<LinkErrorCode | null>(null);

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.status.set('error');
      this.errorCode.set('NOT_FOUND');
      return;
    }

    const result = await this.db.resolveLink(token);
    if (result.ok) {
      this.state.setState({
        participantId: result.participantId,
        lang: result.lang,
        questions: result.questions,
        token: result.token,
      });
      this.router.navigate(['/form']);
      return;
    }

    if (result.error === 'ALREADY_COMPLETED') {
      this.status.set('already');
    } else {
      this.status.set('error');
      this.errorCode.set(result.error);
    }
  }
}
