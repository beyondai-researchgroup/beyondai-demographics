import { Injectable, signal } from '@angular/core';

export interface DemographicQuestionOption {
  id: number;
  labelSr: string;
  labelEn: string;
  isOtherSpecify: boolean;
}

export interface DemographicQuestion {
  id: number;
  type: 'TEXT' | 'SINGLE_CHOICE';
  promptSr: string;
  promptEn: string;
  options: DemographicQuestionOption[];
}

export interface DemographicsState {
  participantId: string;
  lang: 'sr' | 'en';
  questions: DemographicQuestion[];
  /** The magic-link token itself — the submit endpoint is token-addressed, same as resolveLink. */
  token: string;
}

const STORAGE_KEY = 'demographicsapp-state';

/**
 * Minimal session state: the resolved, research-configured question list + locked language for
 * this run, keyed off the magic link token. Persisted to sessionStorage so a page refresh
 * mid-form doesn't lose it — same pattern as every sibling app's StateService (REI-40/Big Five/
 * Task App).
 */
@Injectable({ providedIn: 'root' })
export class StateService {
  private readonly _state = signal<DemographicsState | null>(this.restore());
  readonly state = this._state.asReadonly();

  setState(state: DemographicsState): void {
    this._state.set(state);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }

  clear(): void {
    this._state.set(null);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  private restore(): DemographicsState | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DemographicsState) : null;
    } catch {
      return null;
    }
  }
}
