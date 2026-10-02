import { EngineLine, PositionAnalysis, Score } from '../models/chess.models';
import { sideToMove } from '../chess/chess-utils';

export interface SearchOptions {
  /** Profundidad en medias jugadas (por defecto 12). */
  depth?: number;
  /** Alternativa a la profundidad: milisegundos de búsqueda. */
  movetime?: number;
  /** Cuántas líneas distintas devolver (las N mejores jugadas). */
  multipv?: number;
}

/**
 * Stockfish compilado a WebAssembly. Lo publica el paquete npm `stockfish` y
 * angular.json lo copia a /engine al compilar: es código generado, no se edita.
 */
const ENGINE_URL = 'engine/stockfish-19-lite-single.js';

/**
 * Habla con Stockfish mediante el protocolo UCI: le mandamos órdenes de texto y
 * responde línea a línea. Una búsqueda es siempre así:
 *
 *   → position fen <fen>
 *   → go depth 12
 *   ← info depth 1 multipv 1 score cp 30 pv e2e4 e7e5 …   (varias, cada vez más profundas)
 *   ← bestmove e2e4
 *
 * El motor solo piensa una posición a la vez, así que las búsquedas se encolan.
 */
export class UciEngine {
  private readonly worker = new Worker(ENGINE_URL);
  private readonly ready: Promise<void>;
  /** Cadena de tareas: cada búsqueda empieza cuando acaba la anterior. */
  private queue: Promise<unknown> = Promise.resolve();
  /** Quién está escuchando ahora las líneas del motor. */
  private onLine: ((line: string) => void) | null = null;
  private multipv = 1;

  constructor() {
    this.worker.onmessage = (event: MessageEvent<string>) => this.onLine?.(String(event.data));
    this.ready = this.start();
  }

  analyze(fen: string, options: SearchOptions): Promise<PositionAnalysis> {
    return this.enqueue(() => this.search(fen, options));
  }

  /** Olvida lo aprendido en la partida anterior (tabla de transposición). */
  newGame(): void {
    this.enqueue(async () => {
      this.send('ucinewgame');
      await this.request('isready', 'readyok');
    });
  }

  destroy(): void {
    this.worker.terminate();
  }

  // ───────────────────────── Conversación UCI ─────────────────────────

  private async start(): Promise<void> {
    await this.request('uci', 'uciok');
    this.send('setoption name Hash value 32');
    await this.request('isready', 'readyok');
  }

  private async search(fen: string, options: SearchOptions): Promise<PositionAnalysis> {
    await this.ready;
    this.setMultiPv(options.multipv ?? 1);

    // El motor puntúa desde el lado que mueve; lo pasamos siempre al punto de vista de las blancas
    const perspective = sideToMove(fen) === 'w' ? 1 : -1;
    const best = new Map<number, EngineLine>();

    this.send(`position fen ${fen}`);
    await this.request(goCommand(options), 'bestmove', (line) => {
      const info = parseInfo(line, perspective);
      if (info) best.set(info.multipv, info.line);
    });

    const lines = [...best.entries()].sort(([a], [b]) => a - b).map(([, line]) => line);
    return { fen, depth: Math.max(0, ...lines.map((l) => l.depth)), lines };
  }

  private setMultiPv(value: number): void {
    if (value === this.multipv) return;
    this.send(`setoption name MultiPV value ${value}`);
    this.multipv = value;
  }

  // ───────────────────────── Envío y espera ─────────────────────────

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private send(command: string): void {
    this.worker.postMessage(command);
  }

  /** Envía una orden y espera a la línea que empieza por `until`; el resto se pasa a `each`. */
  private request(command: string, until: string, each?: (line: string) => void): Promise<void> {
    return new Promise((resolve) => {
      this.onLine = (line) => {
        if (line.startsWith(until)) {
          this.onLine = null;
          resolve();
        } else {
          each?.(line);
        }
      };
      this.send(command);
    });
  }
}

function goCommand(options: SearchOptions): string {
  return options.movetime ? `go movetime ${options.movetime}` : `go depth ${options.depth ?? 12}`;
}

/**
 * Lee una línea "info … multipv 2 score cp -35 … pv g1f3 b8c6 …".
 * Devuelve null si no trae jugadas o si la puntuación es solo un límite provisional.
 */
function parseInfo(line: string, perspective: number): { multipv: number; line: EngineLine } | null {
  if (!line.startsWith('info') || !line.includes(' pv ')) return null;

  const tokens = line.split(' ');
  const valueAfter = (key: string) => tokens[tokens.indexOf(key) + 1];

  const scoreAt = tokens.indexOf('score');
  if (scoreAt < 0) return null;
  const [kind, value, bound] = tokens.slice(scoreAt + 1, scoreAt + 4);
  if (bound === 'lowerbound' || bound === 'upperbound') return null;

  const pv = tokens.slice(tokens.indexOf('pv') + 1);
  const score: Score = { kind: kind === 'mate' ? 'mate' : 'cp', value: Number(value) * perspective };

  return {
    multipv: tokens.includes('multipv') ? Number(valueAfter('multipv')) : 1,
    line: { move: pv[0], pv, score, depth: Number(valueAfter('depth')) },
  };
}
