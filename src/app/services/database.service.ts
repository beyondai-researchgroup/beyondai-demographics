import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';
import { DemographicQuestion } from './state.service';

// Generous on purpose: the API runs on Render's free tier, which sleeps after ~15 min idle and
// needs 30-50 s to wake up — a 10 s limit made the first click on an emailed link fail.
const REQUEST_TIMEOUT_MS = 90_000;

interface LinkResolveResponse {
  participantId: string;
  lang: 'sr' | 'en';
  questions: DemographicQuestion[];
}

export type LinkResolveResult =
  | ({ ok: true; token: string } & LinkResolveResponse)
  | { ok: false; error: 'NOT_FOUND' | 'EXPIRED' | 'ALREADY_COMPLETED' | 'NOT_ACTIVE' | 'SERVER_ERROR' };

export interface AnswerPayload {
  value: string;
  otherText?: string;
}

export type SubmitAnswersResult =
  | { ok: true }
  | { ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private http = inject(HttpClient);

  async resolveLink(token: string): Promise<LinkResolveResult> {
    try {
      const res = await firstValueFrom(
        this.http.get<LinkResolveResponse>(`/api/link/${encodeURIComponent(token)}`).pipe(timeout(REQUEST_TIMEOUT_MS))
      );
      return { ok: true, token, ...res };
    } catch (err: any) {
      const code = err?.error?.error;
      if (code === 'NOT_FOUND' || code === 'EXPIRED' || code === 'ALREADY_COMPLETED' || code === 'NOT_ACTIVE') {
        return { ok: false, error: code };
      }
      return { ok: false, error: 'SERVER_ERROR' };
    }
  }

  async submitAnswers(token: string, answers: Record<string, AnswerPayload>, lang: 'sr' | 'en'): Promise<SubmitAnswersResult> {
    try {
      await firstValueFrom(
        this.http.post<void>(`/api/link/${encodeURIComponent(token)}/submit`, { answers, lang }).pipe(timeout(REQUEST_TIMEOUT_MS))
      );
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.error?.error ?? 'SUBMIT_FAILED' };
    }
  }
}
