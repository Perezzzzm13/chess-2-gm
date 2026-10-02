export interface ChatMessage {
  id: number;
  /** me = el jugador; them = el rival (persona o bot); system = avisos de la partida. */
  from: 'me' | 'them' | 'system';
  author: string;
  text: string;
}

export const MAX_CHAT_LENGTH = 140;
