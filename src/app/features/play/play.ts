import { Component, computed, DestroyRef, effect, inject, input, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { Color, GameResult, MoveInput, Uci } from '../../core/models/chess.models';
import { MoveEvaluation } from '../../core/models/classification.models';
import { GameMode, PlayerInfo, SavedGame } from '../../core/models/game.models';
import { materialInfo, moveToUci, opposite, randomId, scoreToCp, uciToInput } from '../../core/chess/chess-utils';
import { CLASSIFICATIONS, gameAccuracy } from '../../core/chess/classification';
import { detectOpening } from '../../core/chess/opening-book';
import { AnalysisService } from '../../core/engine/analysis.service';
import { botAcceptsDraw, botStyle, chooseBotMove } from '../../core/engine/bot-brain';
import { EngineService } from '../../core/engine/engine.service';
import { gameXp, scoreFor } from '../../core/progression/progression';
import { GameHistoryService } from '../../core/services/game-history.service';
import { PeerMessage, PeerService } from '../../core/services/peer.service';
import { ProfileService } from '../../core/services/profile.service';
import { SoundService } from '../../core/services/sound.service';
import { BotProfile, botById, customBot } from '../../data/bots';
import { Board } from '../../shared/components/board/board';
import { ClassBadge } from '../../shared/components/class-badge/class-badge';
import { EvalBar } from '../../shared/components/eval-bar/eval-bar';
import { MoveList } from '../../shared/components/move-list/move-list';
import { PlayerCard } from '../../shared/components/player-card/player-card';
import { Icon } from '../../shared/components/icon/icon';
import { Chat } from '../../shared/components/chat/chat';
import { MAX_CHAT_LENGTH } from '../../shared/components/chat/chat.models';
import { QUICK_PHRASES } from '../../data/bot-chat';
import { GameChat } from './game-chat';
import { Variant, variantById } from '../../data/variants';

interface GameEnd {
  result: GameResult;
  termination: string;
  score: number;
  ratingDelta: number | null;
  newRating: number | null;
  xp: number;
}

const MIN_BOT_DELAY = 220;

@Component({
  selector: 'app-play',
  imports: [Board, PlayerCard, MoveList, EvalBar, ClassBadge, RouterLink, Icon, Chat],
  templateUrl: './play.html',
  styleUrl: './play.scss',
  providers: [GameChat],
})
export class Play implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly engine = inject(EngineService);
  private readonly analysis = inject(AnalysisService);
  private readonly history = inject(GameHistoryService);
  private readonly sound = inject(SoundService);
  readonly profile = inject(ProfileService);
  readonly peer = inject(PeerService);
  readonly chat = inject(GameChat);

  /** Pestaña del panel lateral: la lista de jugadas o el chat. */
  readonly sideTab = signal<'moves' | 'chat'>('moves');
  readonly quickPhrases = QUICK_PHRASES;
  /** Ply de la última reacción del bot en el chat, para que no hable en cada jugada. */
  private lastBotReaction = -10;

  // Parámetros de la ruta (query params y data)
  readonly mode = input<GameMode>('bot');
  readonly bot = input<string>();
  readonly elo = input<string>();
  readonly color = input<string>();
  readonly feedbackParam = input<string>(undefined, { alias: 'feedback' });
  readonly variantParam = input<string>(undefined, { alias: 'variante' });

  private chess = new Chess();
  private destroyed = false;
  private evalChain: Promise<unknown> = Promise.resolve();
  private setupKey = '';

  readonly gameId = signal(randomId());
  /** Modo de juego: clásico o una variante con otra posición inicial. */
  readonly variant = signal<Variant>(variantById(null));
  readonly botProfile = signal<BotProfile | null>(null);
  readonly playerColor = signal<Color>('w');
  readonly orientation = signal<Color>('w');
  readonly fens = signal<string[]>([this.variant().startFen]);
  readonly moves = signal<Uci[]>([]);
  readonly sans = signal<string[]>([]);
  readonly evaluations = signal<(MoveEvaluation | null)[]>([]);
  readonly feedback = signal(true);
  readonly botThinking = signal(false);
  readonly end = signal<GameEnd | null>(null);
  readonly showEndModal = signal(false);
  /** Ply que se está viendo; null = posición actual. */
  readonly viewPly = signal<number | null>(null);
  readonly confirmResign = signal(false);
  readonly notice = signal<string | null>(null);
  readonly drawOffered = signal(false);
  readonly rematchOffered = signal(false);
  readonly rematchSent = signal(false);

  readonly isFriend = computed(() => this.mode() === 'friend');
  readonly currentPly = computed(() => this.viewPly() ?? this.moves().length - 1);
  readonly displayFen = computed(() => this.fens()[this.currentPly() + 1]);
  readonly isLive = computed(() => this.viewPly() === null);
  readonly turn = computed(() => this.fens()[this.fens().length - 1].split(' ')[1] as Color);
  readonly myTurn = computed(() => !this.end() && this.turn() === this.playerColor());
  readonly movable = computed(() => (this.isLive() && this.myTurn() && !this.botThinking() ? this.playerColor() : 'none'));

  readonly lastMove = computed<[string, string] | null>(() => {
    const uci = this.moves()[this.currentPly()];
    return uci ? [uci.slice(0, 2), uci.slice(2, 4)] : null;
  });

  readonly currentEvaluation = computed(() => this.evaluations()[this.currentPly()] ?? null);

  readonly badge = computed(() => {
    const ev = this.currentEvaluation();
    const last = this.lastMove();
    if (!this.feedback() || !ev || !last) return null;
    return { square: last[1], classification: ev.classification };
  });

  readonly evalScore = computed(() => this.currentEvaluation()?.scoreAfter ?? null);

  /** Ply de mi última jugada (las partidas empiezan en la posición inicial: plies pares = blancas). */
  private readonly myLastPly = computed(() => {
    let ply = this.moves().length - 1;
    if (ply >= 0 && (ply % 2 === 0 ? 'w' : 'b') !== this.playerColor()) ply--;
    return ply;
  });
  /** Feedback de mi última jugada (null mientras se analiza). */
  readonly myLastEvaluation = computed(() => this.evaluations()[this.myLastPly()] ?? null);
  readonly analyzingMine = computed(() => this.myLastPly() >= 0 && !this.myLastEvaluation());
  readonly myLastInfo = computed(() => {
    const ev = this.myLastEvaluation();
    return ev ? CLASSIFICATIONS[ev.classification] : null;
  });
  readonly showBestHint = computed(() => {
    const ev = this.myLastEvaluation();
    return !!ev && ['inaccuracy', 'mistake', 'blunder', 'miss'].includes(ev.classification);
  });

  readonly me = computed<PlayerInfo>(() => this.profile.playerInfo());

  readonly opponent = computed<PlayerInfo>(() => {
    if (this.isFriend()) return this.peer.opponent() ?? { name: 'Rival', piece: 'p', tint: '#5d7088' };
    const bot = this.botProfile();
    return bot
      ? { name: bot.name, rating: bot.elo, piece: bot.piece, tint: bot.tint, isBot: true }
      : { name: 'Bot', piece: 'r', tint: '#7a6a5a' };
  });

  readonly white = computed(() => (this.playerColor() === 'w' ? this.me() : this.opponent()));
  readonly black = computed(() => (this.playerColor() === 'b' ? this.me() : this.opponent()));
  readonly topColor = computed(() => opposite(this.orientation()));
  readonly material = computed(() => materialInfo(this.displayFen(), this.variant().startFen));

  constructor() {
    // Partidas con amigos: cada nueva partida (incluidas revanchas) reinicia el tablero
    effect(() => {
      const n = this.peer.gameNumber();
      if (this.isFriend() && n > 0) untracked(() => this.startFriendGame());
    });
    effect(() => {
      if (this.isFriend() && this.peer.status() === 'disconnected' && !untracked(this.end)) {
        this.notice.set('Tu rival se ha desconectado.');
      }
    });
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      // Salir de la pantalla de partida con un amigo cierra la sala
      if (this.isFriend()) this.peer.leave();
    });
  }

  ngOnInit(): void {
    this.feedback.set(this.feedbackParam() ? this.feedbackParam() === '1' : this.profile.profile().feedbackByDefault);

    if (this.isFriend()) {
      if (this.peer.status() !== 'playing') {
        this.router.navigate(['/amigos']);
        return;
      }
      this.peer.messages.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((m) => this.onPeerMessage(m));
      return;
    }
    this.startBotGame();
  }

  // ───────────────────────── Inicio de partida ─────────────────────────

  private startBotGame(): void {
    const elo = Number(this.elo());
    const bot = botById(this.bot()) ?? customBot(Number.isFinite(elo) && elo > 0 ? elo : 800);
    this.botProfile.set(bot);
    const choice = this.color() ?? 'random';
    this.variant.set(variantById(this.variantParam()));
    this.setupKey = `${bot.id}|${bot.elo}|${choice}|${this.variant().id}`;

    const ongoing = this.history.loadOngoing();
    if (ongoing && ongoing.setupKey === this.setupKey && ongoing.moves.length) {
      this.resetBoard(ongoing.playerColor, ongoing.id);
      ongoing.moves.forEach((uci) => this.applyMove(uci, { silent: true }));
      this.notice.set('Partida recuperada. ¡Continúa donde lo dejaste!');
    } else {
      const color: Color = choice === 'w' || choice === 'b' ? choice : Math.random() < 0.5 ? 'w' : 'b';
      this.resetBoard(color, randomId());
      if (!this.variant().rated) this.notice.set(`${this.variant().name}: ${this.variant().tagline.toLowerCase()}`);
    }
    this.chat.botSays(bot.name, bot.greeting, 300);
    this.engine.newBotGame();
    this.maybeBotMove();
  }

  private startFriendGame(): void {
    this.variant.set(variantById(this.peer.variant()));
    this.resetBoard(this.peer.myColor(), randomId());
    this.rematchOffered.set(false);
    this.rematchSent.set(false);
    this.notice.set(this.myTurn() ? 'Juegas con blancas: ¡te toca mover!' : 'Juegas con negras: espera la jugada de tu rival.');
  }

  private resetBoard(color: Color, id: string): void {
    this.chess = new Chess(this.variant().startFen);
    this.gameId.set(id);
    this.playerColor.set(color);
    this.orientation.set(color);
    this.fens.set([this.variant().startFen]);
    this.moves.set([]);
    this.sans.set([]);
    this.evaluations.set([]);
    this.end.set(null);
    this.showEndModal.set(false);
    this.viewPly.set(null);
    this.confirmResign.set(false);
    this.drawOffered.set(false);
    this.evalChain = Promise.resolve();
  }

  // ───────────────────────── Jugadas ─────────────────────────

  onBoardMove(input: MoveInput): void {
    if (!this.myTurn() || !this.isLive()) return;
    const uci = input.from + input.to + (input.promotion ?? '');
    if (!this.applyMove(uci)) return;
    if (this.isFriend()) this.peer.send({ type: 'move', uci, ply: this.moves().length - 1 });
    this.maybeBotMove();
  }

  private applyMove(uci: Uci, options: { silent?: boolean } = {}): boolean {
    const fenBefore = this.chess.fen();
    let move;
    try {
      move = this.chess.move(uciToInput(uci));
    } catch {
      return false;
    }
    const ply = this.moves().length;
    const normalized = moveToUci(move);
    this.moves.update((m) => [...m, normalized]);
    this.sans.update((s) => [...s, move.san]);
    this.fens.update((f) => [...f, this.chess.fen()]);
    this.evaluations.update((e) => [...e, null]);
    this.notice.set(null);

    if (!options.silent) {
      this.sound.play(this.chess.inCheck() ? 'check' : move.captured ? 'capture' : 'move');
    }
    this.queueEvaluation(ply, fenBefore, normalized);

    if (!this.isFriend() && !this.end()) {
      this.history.saveOngoing({ id: this.gameId(), setupKey: this.setupKey, playerColor: this.playerColor(), moves: this.moves() });
    }
    this.checkGameOver();
    return true;
  }

  /** Evalúa las jugadas en orden (la clasificación necesita la pérdida de la jugada anterior). */
  private queueEvaluation(ply: number, fenBefore: string, uci: Uci): void {
    const gameId = this.gameId();
    this.evalChain = this.evalChain.then(async () => {
      if (this.destroyed || gameId !== this.gameId()) return;
      const previousLoss = ply > 0 ? (this.evaluations()[ply - 1]?.loss ?? 0) : 0;
      const ev = await this.analysis.evaluateMove(ply, fenBefore, uci, previousLoss);
      if (gameId !== this.gameId()) return;
      this.evaluations.update((list) => list.map((e, i) => (i === ply ? ev : e)));
      this.botReactsTo(ev);
    });
  }

  private async maybeBotMove(): Promise<void> {
    const bot = this.botProfile();
    if (this.isFriend() || !bot || this.end() || this.turn() === this.playerColor()) return;

    this.botThinking.set(true);
    const gameId = this.gameId();
    const fen = this.chess.fen();
    const started = performance.now();
    const style = botStyle(bot.elo);
    const analysis = await this.engine.think(fen, { depth: style.depth, multipv: style.multipv });
    const uci = chooseBotMove(fen, analysis, style);
    const wait = MIN_BOT_DELAY + Math.random() * 280 - (performance.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    if (this.destroyed || gameId !== this.gameId() || this.end()) return;
    this.botThinking.set(false);
    this.applyMove(uci);
  }

  // ───────────────────────── Chat ─────────────────────────

  setSideTab(tab: 'moves' | 'chat'): void {
    this.sideTab.set(tab);
    this.chat.setOpen(tab === 'chat');
  }

  sendChat(text: string): void {
    this.chat.mine(this.me().name, text);
    if (this.isFriend()) this.peer.send({ type: 'chat', text });
    else if (this.botProfile()) this.chat.botReplies(this.botProfile()!.name, text);
  }

  /** El bot comenta tus jugadas más llamativas (como mucho una vez cada pocas jugadas). */
  private botReactsTo(ev: MoveEvaluation): void {
    const bot = this.botProfile();
    if (this.isFriend() || !bot || this.end() || ev.color !== this.playerColor()) return;
    if (ev.ply - this.lastBotReaction < 6) return;
    if (ev.classification === 'blunder') this.chat.botReacts(bot.name, 'playerBlunder');
    else if (ev.classification === 'brilliant') this.chat.botReacts(bot.name, 'playerBrilliant');
    else return;
    this.lastBotReaction = ev.ply;
  }

  // ───────────────────────── Final de partida ─────────────────────────

  private checkGameOver(): void {
    const c = this.chess;
    if (c.isCheckmate()) this.finish(c.turn() === 'w' ? '0-1' : '1-0', 'Jaque mate');
    else if (c.isStalemate()) this.finish('1/2-1/2', 'Rey ahogado');
    else if (c.isThreefoldRepetition()) this.finish('1/2-1/2', 'Triple repetición');
    else if (c.isInsufficientMaterial()) this.finish('1/2-1/2', 'Material insuficiente');
    else if (c.isDrawByFiftyMoves()) this.finish('1/2-1/2', 'Regla de los 50 movimientos');
  }

  private finish(result: GameResult, termination: string): void {
    if (this.end()) return;
    const score = scoreFor(result, this.playerColor());
    const bot = this.botProfile();
    const ratingBefore = this.profile.profile().rating;

    let ratingDelta: number | null = null;
    let xp: number;
    if (this.isFriend()) {
      xp = gameXp(score, this.opponent().rating ?? 800, null, this.moves().length);
    } else {
      // Las variantes son amistosas: dan experiencia pero no mueven el ELO
      ratingDelta = bot && this.variant().rated ? this.profile.applyRatedResult(bot.elo, score) : null;
      xp = gameXp(score, bot?.elo ?? 800, this.myAccuracy(), this.moves().length);
      this.history.clearOngoing();
    }
    this.profile.recordGameStats(score);

    this.end.set({
      result,
      termination,
      score,
      ratingDelta,
      newRating: ratingDelta === null ? null : this.profile.profile().rating,
      xp,
    });
    this.botThinking.set(false);
    this.confirmResign.set(false);
    this.viewPly.set(null);
    this.sound.play('end');
    if (bot && !this.isFriend()) this.chat.botReacts(bot.name, score === 1 ? 'botLoses' : score === 0.5 ? 'draw' : 'botWins');
    this.saveGame(ratingBefore, ratingDelta, xp);
    setTimeout(() => this.showEndModal.set(true), 700);
    this.profile.addXp(xp, score === 1 ? 'Victoria' : score === 0.5 ? 'Tablas' : 'Partida completada');

    // Guardamos de nuevo cuando terminen los análisis pendientes
    const gameId = this.gameId();
    this.evalChain.then(() => {
      const saved = this.history.get(gameId);
      if (saved) this.history.save({ ...saved, evaluations: this.evaluations() });
    });
  }

  private myAccuracy(): number | null {
    const mine = this.evaluations().filter((e): e is MoveEvaluation => !!e && e.color === this.playerColor());
    return mine.length ? gameAccuracy(mine) : null;
  }

  private saveGame(ratingBefore: number, ratingDelta: number | null, xp: number): void {
    const end = this.end()!;
    const bot = this.botProfile();
    const game: SavedGame = {
      id: this.gameId(),
      date: new Date().toISOString(),
      mode: this.isFriend() ? 'friend' : 'bot',
      playerColor: this.playerColor(),
      white: this.white(),
      black: this.black(),
      startFen: this.variant().startFen,
      moves: this.moves(),
      sans: this.sans(),
      result: end.result,
      termination: end.termination,
      botId: this.isFriend() ? undefined : bot?.id,
      botElo: this.isFriend() ? undefined : bot?.elo,
      ratingBefore: ratingDelta === null ? undefined : ratingBefore,
      ratingDelta: ratingDelta ?? undefined,
      xpGained: xp,
      opening: this.variant().id === 'clasico' ? detectOpening(this.variant().startFen, this.sans()) : this.variant().name,
      variant: this.variant().id === 'clasico' ? undefined : this.variant().id,
      evaluations: this.evaluations(),
    };
    this.history.save(game);
  }

  // ───────────────────────── Acciones ─────────────────────────

  resign(): void {
    if (this.end()) return;
    if (!this.confirmResign()) {
      this.confirmResign.set(true);
      return;
    }
    if (this.isFriend()) this.peer.send({ type: 'resign' });
    this.finish(this.playerColor() === 'w' ? '0-1' : '1-0', 'Abandono');
  }

  offerDraw(): void {
    if (this.end()) return;
    if (this.isFriend()) {
      this.peer.send({ type: 'draw-offer' });
      this.notice.set('Has ofrecido tablas. Esperando respuesta...');
      return;
    }
    const last = this.evaluations().filter(Boolean).at(-1);
    const botColor = opposite(this.playerColor());
    const botCp = last ? scoreToCp(last.scoreAfter) * (botColor === 'w' ? 1 : -1) : 0;
    if (botAcceptsDraw(botCp, this.moves().length)) {
      this.finish('1/2-1/2', 'Tablas de mutuo acuerdo');
    } else {
      this.notice.set(`${this.botProfile()?.name} rechaza las tablas. ¡Quiere seguir luchando!`);
    }
  }

  answerDraw(accepted: boolean): void {
    this.drawOffered.set(false);
    this.peer.send({ type: 'draw-answer', accepted });
    if (accepted) this.finish('1/2-1/2', 'Tablas de mutuo acuerdo');
  }

  rematch(): void {
    if (!this.isFriend()) {
      this.history.clearOngoing();
      this.startBotGame();
      return;
    }
    if (this.rematchOffered()) {
      this.acceptRematch();
      return;
    }
    this.peer.send({ type: 'rematch-offer' });
    this.rematchSent.set(true);
  }

  acceptRematch(): void {
    if (this.peer.role() === 'host') this.peer.startRematch();
    else this.peer.send({ type: 'rematch-accept' });
  }

  toggleFeedback(): void {
    this.feedback.update((v) => !v);
    this.profile.update({ feedbackByDefault: this.feedback() });
  }

  flip(): void {
    this.orientation.update(opposite);
  }

  goTo(ply: number): void {
    const last = this.moves().length - 1;
    const target = Math.max(-1, Math.min(last, ply));
    this.viewPly.set(target === last ? null : target);
  }

  private onPeerMessage(message: PeerMessage): void {
    switch (message.type) {
      case 'move':
        if (message.ply === this.moves().length && !this.myTurn()) this.applyMove(message.uci);
        break;
      case 'resign':
        this.finish(this.playerColor() === 'w' ? '1-0' : '0-1', 'Abandono del rival');
        break;
      case 'draw-offer':
        this.drawOffered.set(true);
        break;
      case 'draw-answer':
        if (message.accepted) this.finish('1/2-1/2', 'Tablas de mutuo acuerdo');
        else this.notice.set('Tu rival ha rechazado las tablas.');
        break;
      case 'rematch-offer':
        this.rematchOffered.set(true);
        break;
      case 'rematch-accept':
        if (this.peer.role() === 'host') this.peer.startRematch();
        break;
      case 'chat':
        this.chat.theirs(this.opponent().name, String(message.text).slice(0, MAX_CHAT_LENGTH));
        break;
    }
  }
}
