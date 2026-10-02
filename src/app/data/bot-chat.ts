/** Lo que dicen los bots en el chat de la partida. */

export type BotChatEvent = 'playerBlunder' | 'playerBrilliant' | 'botWins' | 'botLoses' | 'draw';

const EVENT_LINES: Record<BotChatEvent, string[]> = {
  playerBlunder: ['¡Uy! Gracias por el regalo.', '¿Seguro? Eso me viene de maravilla.', 'Ese descuido te va a doler…'],
  playerBrilliant: ['¡Vaya jugada! Me has dejado sin palabras.', 'Eso no lo había visto venir.', 'Impresionante, de verdad.'],
  botWins: ['Buena partida. ¡La próxima será tuya!', 'Me ha costado, ¿eh? Revisa la partida y vuelve.'],
  botLoses: ['¡Bien jugado! Me has ganado limpiamente.', 'Me rindo ante tu juego. ¡Enhorabuena!'],
  draw: ['Tablas. Ni para ti ni para mí.', 'Un empate justo, creo yo.'],
};

/** Respuestas según lo que escriba el jugador (la primera regla que encaje). */
const REPLIES: { match: RegExp; lines: string[] }[] = [
  { match: /\b(hola|buenas|saludos)\b/i, lines: ['¡Hola! Que gane el mejor.', '¡Buenas! ¿Preparado?'] },
  { match: /\b(gg|bien jugad|buena partida)\b/i, lines: ['¡Igualmente!', 'Gracias, ha sido un placer.'] },
  { match: /\b(suerte)\b/i, lines: ['¡Lo mismo te digo!', 'La suerte no existe en el ajedrez… ¿o sí?'] },
  { match: /\b(buena|bonita|genial)\b/i, lines: ['Gracias, la tenía preparada.', 'Se hace lo que se puede.'] },
  { match: /\b(uff|ups|vaya|madre)\b/i, lines: ['Respira hondo, aún queda partida.', 'Tranquilo, nos pasa a todos.'] },
];
const FALLBACK = ['Hmm… estoy concentrado.', 'Habla con tus piezas, no conmigo.', 'Ya veremos quién ríe el último.', 'Jeje.'];

export const QUICK_PHRASES = ['¡Hola!', '¡Suerte!', '¡Buena jugada!', 'Uff…', '¡Bien jugado!', 'GG'];

function pick(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}

export function botLineFor(event: BotChatEvent): string {
  return pick(EVENT_LINES[event]);
}

export function botReplyTo(text: string): string {
  return pick(REPLIES.find((r) => r.match.test(text))?.lines ?? FALLBACK);
}
