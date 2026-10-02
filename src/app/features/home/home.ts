import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLASSIFICATIONS, gameAccuracy } from '../../core/chess/classification';
import { Classification, MoveEvaluation } from '../../core/models/classification.models';
import { scoreFor } from '../../core/progression/progression';
import { GameHistoryService } from '../../core/services/game-history.service';
import { ProfileService } from '../../core/services/profile.service';
import { PuzzlePathService } from '../../core/services/puzzle-path.service';
import { BOTS } from '../../data/bots';
import { puzzleStartPosition, puzzleThemeLabels } from '../../data/puzzles';
import { ClassBadge } from '../../shared/components/class-badge/class-badge';
import { Icon } from '../../shared/components/icon/icon';
import { Portrait } from '../../shared/components/portrait/portrait';
import { Showcase } from './showcase/showcase';

/** Lo que merece la pena destacar de una partida: lo muy bueno y los fallos. */
const HIGHLIGHTS: Classification[] = ['brilliant', 'great', 'miss', 'mistake', 'blunder'];

@Component({
  selector: 'app-home',
  imports: [RouterLink, ClassBadge, Icon, Portrait, Showcase],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly profile = inject(ProfileService);
  readonly theme = this.profile.theme;
  private readonly history = inject(GameHistoryService);
  private readonly puzzles = inject(PuzzlePathService);

  /** El bot con ELO más cercano al jugador. */
  readonly suggestedBot = computed(() => {
    const rating = this.profile.profile().rating;
    return BOTS.reduce((best, b) => (Math.abs(b.elo - rating) < Math.abs(best.elo - rating) ? b : best));
  });

  /** Parámetros para retomar la partida a medias contra un bot, si la hay. */
  readonly ongoing = computed(() => {
    const ongoing = this.history.loadOngoing();
    if (!ongoing?.moves.length) return null;
    const [bot, elo, color, variant] = ongoing.setupKey.split('|');
    const variante = variant && variant !== 'clasico' ? variant : null;
    return bot === 'custom' ? { elo, color, variante } : { bot, color, variante };
  });

  readonly totalPuzzles = this.puzzles.stops.length;

  /** El siguiente problema del mapa: lo mismo que encontraría en Problemas. */
  readonly nextPuzzle = computed(() => {
    const stop = this.puzzles.current();
    if (!stop) return null;
    return {
      stop,
      chapter: this.puzzles.chapters[stop.chapter],
      ...puzzleStartPosition(stop.puzzle),
      themes: puzzleThemeLabels(stop.puzzle).filter((t) => !['Corto', 'Largo'].includes(t)).slice(0, 2),
    };
  });

  readonly lastGame = computed(() => {
    const game = this.history.games()[0];
    if (!game) return null;
    const score = scoreFor(game.result, game.playerColor);
    const mine = game.evaluations.filter((e): e is MoveEvaluation => !!e && e.color === game.playerColor);
    const analyzed = game.evaluations.filter(Boolean).length === game.moves.length && mine.length > 0;
    return {
      game,
      opponent: game.playerColor === 'w' ? game.black : game.white,
      moves: Math.ceil(game.moves.length / 2),
      label: score === 1 ? 'Victoria' : score === 0.5 ? 'Tablas' : 'Derrota',
      tone: score === 1 ? 'win' : score === 0.5 ? 'draw' : 'loss',
      accuracy: analyzed ? Math.round(gameAccuracy(mine)) : null,
      highlights: HIGHLIGHTS.map((c) => ({
        classification: c,
        label: CLASSIFICATIONS[c].plural.toLowerCase(),
        count: mine.filter((e) => e.classification === c).length,
      })).filter((h) => h.count > 0),
    };
  });
}
