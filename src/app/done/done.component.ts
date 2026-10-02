import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-done',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="page-centered">
      <div class="card done-card">
        <span class="done-icon" aria-hidden="true">✓</span>
        <h1 class="done-title">{{ 'DONE.TITLE' | translate }}</h1>
        <p class="done-text">{{ 'DONE.TEXT' | translate }}</p>
      </div>
    </div>
  `,
  styles: [`
    .done-card {
      max-width: 420px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .done-icon {
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
    .done-title {
      font-size: 26px;
      font-weight: 700;
    }
    .done-text {
      color: var(--color-muted);
      margin: 0;
    }
  `],
})
export class DoneComponent {}