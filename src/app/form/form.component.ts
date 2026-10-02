import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DatabaseService, AnswerPayload } from '../services/database.service';
import { StateService } from '../services/state.service';

interface LocalAnswer {
  value: string;
  otherText: string;
}

/**
 * The demographic form itself: every research-configured question rendered in order, gated
 * behind sessionGuard (state only exists after a real /link/:token resolve). TEXT questions are
 * a free-text textarea; SINGLE_CHOICE questions render as a group of selectable option buttons
 * (same visual idiom as rei40-andrejkatin's Likert buttons, generalized to a variable option
 * count) — when the selected option has isOtherSpecify set, a free-text field for that option's
 * detail is revealed right below it. Every question is required (no per-question "required"
 * toggle in v1, matches the source form). One-shot submit — no timer, no retry-with-queued-state
 * beyond a plain "try again" on failure.
 */
@Component({
  selector: 'app-form',
  standalone: true,
  imports: [TranslateModule, FormsModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.scss',
})
export class FormComponent {
  private db = inject(DatabaseService);
  private stateService = inject(StateService);
  private router = inject(Router);

  readonly state = this.stateService.state()!;
  readonly lang = this.state.lang;

  // questionId -> { value, otherText } — value holds the optionId (as a string) for
  // SINGLE_CHOICE or the raw free text for TEXT.
  private readonly answersMap = signal<Record<number, LocalAnswer>>({});

  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);

  promptFor(question: { promptSr: string; promptEn: string }): string {
    return this.lang === 'en' ? question.promptEn : question.promptSr;
  }

  optionLabel(option: { labelSr: string; labelEn: string }): string {
    return this.lang === 'en' ? option.labelEn : option.labelSr;
  }

  answerFor(questionId: number): LocalAnswer {
    return this.answersMap()[questionId] ?? { value: '', otherText: '' };
  }

  isSelected(questionId: number, optionId: number): boolean {
    return this.answerFor(questionId).value === String(optionId);
  }

  selectOption(questionId: number, optionId: number): void {
    this.answersMap.update((map) => ({ ...map, [questionId]: { value: String(optionId), otherText: '' } }));
  }

  setTextValue(questionId: number, value: string): void {
    this.answersMap.update((map) => ({ ...map, [questionId]: { value, otherText: '' } }));
  }

  setOtherText(questionId: number, otherText: string): void {
    this.answersMap.update((map) => ({ ...map, [questionId]: { ...this.answerFor(questionId), otherText } }));
  }

  /** Whether the currently-selected option for a SINGLE_CHOICE question is flagged
   *  isOtherSpecify — drives the conditional free-text reveal. */
  selectedOptionIsOther(question: { options: { id: number; isOtherSpecify: boolean }[] }, questionId: number): boolean {
    const selectedId = Number(this.answerFor(questionId).value);
    const opt = question.options.find((o) => o.id === selectedId);
    return !!opt?.isOtherSpecify;
  }

  private isQuestionAnswered(question: { id: number; type: 'TEXT' | 'SINGLE_CHOICE'; options: { id: number; isOtherSpecify: boolean }[] }): boolean {
    const a = this.answerFor(question.id);
    if (question.type === 'TEXT') return a.value.trim().length > 0;
    if (!a.value) return false;
    if (this.selectedOptionIsOther(question, question.id)) return a.otherText.trim().length > 0;
    return true;
  }

  readonly allAnswered = computed(() => this.state.questions.every((q) => this.isQuestionAnswered(q)));

  async submit(): Promise<void> {
    if (!this.allAnswered() || this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);

    const payload: Record<string, AnswerPayload> = {};
    for (const q of this.state.questions) {
      const a = this.answerFor(q.id);
      const value = q.type === 'TEXT' ? a.value.trim() : a.value;
      payload[String(q.id)] = this.selectedOptionIsOther(q, q.id)
        ? { value, otherText: a.otherText.trim() }
        : { value };
    }

    const result = await this.db.submitAnswers(this.state.token, payload, this.lang);
    this.submitting.set(false);
    if (result.ok) {
      this.stateService.clear();
      this.router.navigate(['/done']);
    } else {
      this.submitError.set(result.error);
    }
  }
}
