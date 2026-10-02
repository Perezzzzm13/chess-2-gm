import { Color, PieceType } from '../models/chess.models';
import { MoveEvaluation } from '../models/classification.models';
import { colorName, PIECE_NAMES, pvToSan, tryMove } from './chess-utils';

/** A quién se dirige el comentario: al jugador ("tú") o en tercera persona ("las negras"). */
export type CommentVoice = 'you' | 'them';

interface Wording {
  sacrifice: string;
  found: string;
  had: string;
  letGo: string;
  possessive: string;
  costs: string;
  capture: string;
  worse: string;
  won: string;
}

function wording(voice: CommentVoice, color: Color): Wording {
  if (voice === 'you') {
    return {
      sacrifice: 'sacrificas',
      found: 'encontraste',
      had: 'Tenías',
      letGo: 'la dejaste escapar',
      possessive: 'tu',
      costs: 'puede costarte la partida',
      capture: 'Capturas',
      worse: 'tu posición empeora',
      won: 'ganaba',
    };
  }
  const side = colorName(color);
  return {
    sacrifice: `las ${side} sacrifican`,
    found: `las ${side} encontraron`,
    had: `Las ${side} tenían`,
    letGo: 'la dejaron escapar',
    possessive: 'su',
    costs: `puede costarles la partida a las ${side}`,
    capture: 'Captura',
    worse: `la posición de las ${side} empeora`,
    won: 'ganaba',
  };
}

/** Elige una variante de texto de forma estable para la misma jugada. */
function pick(options: string[], seed: number): string {
  return options[seed % options.length];
}

/** Si la mejor respuesta del rival captura material, lo describimos. */
function describeReply(fenBefore: string, ev: MoveEvaluation, w: Wording): string | null {
  const after = tryMove(fenBefore, ev.uci);
  if (!after || !ev.replyPv.length) return null;
  const [replySan] = pvToSan(after.chess.fen(), ev.replyPv, 1);
  const reply = tryMove(after.chess.fen(), ev.replyPv[0]);
  if (!reply || !replySan) return null;
  if (reply.move.captured) {
    const name = PIECE_NAMES[reply.move.captured as PieceType];
    return `El rival puede responder ${replySan} y capturar ${w.possessive} ${name} de ${reply.move.to}.`;
  }
  if (ev.scoreAfter.kind === 'mate') {
    const n = Math.abs(ev.scoreAfter.value);
    const moverWins = (ev.scoreAfter.value > 0) === (ev.color === 'w');
    if (!moverWins) return `Ahora el rival tiene mate en ${n}, empezando por ${replySan}.`;
  }
  return `La amenaza principal del rival es ${replySan}.`;
}

function bestText(ev: MoveEvaluation): string {
  if (ev.scoreBefore.kind === 'mate') {
    const n = Math.abs(ev.scoreBefore.value);
    const moverWins = (ev.scoreBefore.value > 0) === (ev.color === 'w');
    if (moverWins) return `${ev.bestSan}, que forzaba mate en ${n}`;
  }
  return ev.bestSan;
}

/** Qué conseguía la mejor jugada: capturar, dar jaque o forzar mate. */
function bestIdea(fenBefore: string, ev: MoveEvaluation, w: Wording): string {
  const best = tryMove(fenBefore, ev.bestMove)?.move;
  const target = bestText(ev);
  if (best?.captured) return `${target}, que ${w.won} ${PIECE_NAMES[best.captured as PieceType]} de ${best.to}`;
  if (best?.san.includes('+')) return `${target}, con jaque`;
  return target;
}

/**
 * Comentario de una jugada. No repite la etiqueta (Error, Excelente…): la revisión ya la muestra.
 * Para los fallos explica qué amenaza el rival y qué había que jugar.
 */
export function buildComment(ev: MoveEvaluation, fenBefore: string, voice: CommentVoice = 'you'): string {
  const w = wording(voice, ev.color);
  const seed = ev.ply;
  const san = ev.san;
  const played = tryMove(fenBefore, ev.uci)?.move;
  const captureNote = played?.captured ? ` ${w.capture} ${PIECE_NAMES[played.captured as PieceType]} en ${played.to}.` : '';

  if (ev.scoreAfter.kind === 'end') return `${san} da jaque mate. Fin de la partida.`;

  switch (ev.classification) {
    case 'brilliant':
      return pick(
        [
          `${san} entrega material, pero la posición lo justifica de sobra.`,
          `Con ${san} ${w.sacrifice} material a cambio de una iniciativa imparable.`,
        ],
        seed,
      );
    case 'great':
      return `En una posición crítica ${w.found} ${san}, la única jugada que la mantenía.${captureNote}`;
    case 'best':
      return pick(
        [`${san} es justo lo que recomienda el motor.${captureNote}`, `${san} es la jugada más fuerte aquí.${captureNote}`],
        seed,
      );
    case 'excellent':
      return `${san} es casi tan buena como ${ev.bestSan}, la favorita del motor.${captureNote}`;
    case 'good':
      return `${san} mantiene la posición, aunque ${ev.bestSan} era algo más precisa.${captureNote}`;
    case 'book':
      return `${san} es una jugada de la teoría de aperturas.`;
    case 'inaccuracy':
      return `${san} cede parte de la ventaja. Era mejor ${bestIdea(fenBefore, ev, w)}.`;
    case 'miss':
      return `${w.had} una oportunidad clara: ${bestIdea(fenBefore, ev, w)}. Con ${san} ${w.letGo}.`;
    case 'mistake':
    case 'blunder': {
      const reply = describeReply(fenBefore, ev, w);
      const intro = ev.classification === 'blunder' ? `${san} ${w.costs}.` : `Tras ${san} ${w.worse}.`;
      return [intro, reply, `Había que jugar ${bestIdea(fenBefore, ev, w)}.`].filter(Boolean).join(' ');
    }
  }
}
