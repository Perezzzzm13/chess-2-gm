import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chess, Move } from 'chess.js';
import { Arrow, MoveInput } from '../../core/models/chess.models';
import { START_FEN } from '../../core/chess/chess-utils';
import { ProfileService } from '../../core/services/profile.service';
import { SoundService } from '../../core/services/sound.service';
import { OPENINGS } from '../../data/openings';
import { Board } from '../../shared/components/board/board';
import { Icon } from '../../shared/components/icon/icon';

type TrainerMode = 'learn' | 'practice' | 'done';

const OPPONENT_DELAY = 600;
const HINT_AFTER_ERRORS = 2;

@Component({
  selector: 'app-opening-trainer',
  imports: [Board, RouterLink, Icon],
  templateUrl: './opening-trainer.html',
  styleUrl: './opening-trainer.scss',
  host: { '(document:keydown)': 'onKey($event)' },
})
export class OpeningTrainer {
  private readonly profile = inject(ProfileService);
  private readonly sound = inject(SoundService);

  readonly id = input.required<string>();

  readonly opening = computed(() => OPENINGS.find((o) => o.id === this.id()) ?? null);

  /** Jugadas verbose y posiciones de toda la línea (fens[i] = posición antes de la jugada i). */
  private readonly line = computed(() => {
    const chess = new Chess();
    const moves: Move[] = [];
    const fens = [START_FEN];
    for (const step of this.opening()?.steps ?? []) {
      moves.push(chess.move(step.san));
      fens.push(chess.fen());
    }
    return { moves, fens };
  });

  readonly mode = signal<TrainerMode>('learn');
  /** Número de jugadas ya realizadas en el tablero. */
  readonly position = signal(0);
  readonly mistakes = signal(0);
  readonly stepErrors = signal(0);
  readonly feedback = signal<{ tone: 'good' | 'bad'; text: string } | null>(null);
  readonly stars = signal(0);

  readonly total = computed(() => this.line().moves.length);
  readonly fen = computed(() => this.line().fens[this.position()]);
  readonly lastMove = computed<[string, string] | null>(() => {
    const move = this.line().moves[this.position() - 1];
    return move ? [move.from, move.to] : null;
  });

  readonly currentComment = computed(() => this.opening()?.steps[this.position() - 1]?.comment ?? null);
  readonly nextMove = computed(() => this.line().moves[this.position()] ?? null);
  readonly isMyTurn = computed(() => this.nextMove()?.color === this.opening()?.side);

  readonly arrows = computed<Arrow[]>(() => {
    const next = this.nextMove();
    if (!next) return [];
    if (this.mode() === 'learn') return [{ from: next.from, to: next.to, color: '#d6b25e' }];
    if (this.mode() === 'practice' && this.stepErrors() >= HINT_AFTER_ERRORS) return [{ from: next.from, to: next.to }];
    return [];
  });

  readonly movable = computed(() => (this.mode() === 'practice' && this.isMyTurn() ? this.opening()!.side : 'none'));

  // ───────── Modo aprender ─────────

  goTo(position: number): void {
    const target = Math.max(0, Math.min(this.total(), position));
    if (target > this.position()) this.playSound(target - 1);
    this.position.set(target);
  }

  onKey(event: KeyboardEvent): void {
    if (this.mode() !== 'learn') return;
    if (event.key === 'ArrowRight') this.goTo(this.position() + 1);
    if (event.key === 'ArrowLeft') this.goTo(this.position() - 1);
  }

  // ───────── Modo practicar ─────────

  startPractice(): void {
    this.mode.set('practice');
    this.position.set(0);
    this.mistakes.set(0);
    this.stepErrors.set(0);
    this.feedback.set({ tone: 'good', text: 'Juega la línea de memoria. ¡Tú puedes!' });
    this.autoPlayOpponent();
  }

  onMove(input: MoveInput): void {
    const expected = this.nextMove();
    if (this.mode() !== 'practice' || !expected) return;

    if (input.from === expected.from && input.to === expected.to) {
      this.playSound(this.position());
      this.position.update((p) => p + 1);
      this.stepErrors.set(0);
      this.feedback.set({ tone: 'good', text: this.opening()!.steps[this.position() - 1].comment });
      this.afterMove();
    } else {
      this.sound.play('error');
      this.mistakes.update((m) => m + 1);
      this.stepErrors.update((e) => e + 1);
      const hint = this.stepErrors() >= HINT_AFTER_ERRORS ? ' Te marco la jugada correcta con una flecha.' : ' Piensa en la idea de la apertura.';
      this.feedback.set({ tone: 'bad', text: 'Esa no es la jugada de la línea.' + hint });
    }
  }

  private afterMove(): void {
    if (this.position() >= this.total()) {
      this.finish();
      return;
    }
    this.autoPlayOpponent();
  }

  private autoPlayOpponent(): void {
    if (this.isMyTurn() || !this.nextMove()) return;
    setTimeout(() => {
      if (this.mode() !== 'practice') return;
      this.playSound(this.position());
      this.position.update((p) => p + 1);
      this.afterMove();
    }, OPPONENT_DELAY);
  }

  private finish(): void {
    const mistakes = this.mistakes();
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    this.stars.set(stars);
    this.mode.set('done');
    this.sound.play('success');
    this.profile.recordOpening(this.opening()!.id, stars);
  }

  backToLearn(): void {
    this.mode.set('learn');
    this.position.set(0);
    this.feedback.set(null);
  }

  private playSound(moveIndex: number): void {
    const move = this.line().moves[moveIndex];
    if (move) this.sound.play(move.san.includes('+') ? 'check' : move.captured ? 'capture' : 'move');
  }
}
