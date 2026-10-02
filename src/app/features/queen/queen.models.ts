import { EnemyKind } from './game/enemies';

export type AbilityId = 'knight' | 'bishop' | 'castle';

/** Una habilidad activa en el marcador: cuánto le falta y cuántas cargas guarda. */
export interface AbilityHud {
  id: AbilityId;
  /** Tecla que la lanza. */
  key: string;
  /** 0–1: lo que lleva recargado de la siguiente carga. */
  charge: number;
  charges: number;
  maxCharges: number;
}

/** Lo que el marcador necesita saber de la partida (se refresca unas 15 veces por segundo). */
export interface HudState {
  timeLeft: number;
  runTime: number;
  gold: number;
  combo: number;
  /** 0–1: lo que queda de la ventana para encadenar. */
  comboLeft: number;
  stamina: number;
  maxStamina: number;
  frenzy: number;
  frenzyActive: boolean;
  frenzyReady: boolean;
  /** Fiebre del oro activa (oro doble). */
  goldRush: boolean;
  abilities: AbilityHud[];
}

export interface RunResult {
  /** Oro total de la partida, con la hucha ya sumada. */
  gold: number;
  /** De ese oro, lo que puso la hucha al terminar. */
  bonus: number;
  captures: number;
  bestCombo: number;
  crits: number;
  golden: number;
  walls: number;
  byKind: Record<EnemyKind, number>;
  /** Terminada antes de tiempo desde la pausa. */
  abandoned: boolean;
}
