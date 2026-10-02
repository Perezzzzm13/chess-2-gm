import { computed, inject, Injectable, signal } from '@angular/core';
import { SoundService } from '../../core/services/sound.service';
import { BotChatEvent, botLineFor, botReplyTo } from '../../data/bot-chat';
import { ChatMessage } from '../../shared/components/chat/chat.models';

/**
 * Mensajes del chat de una partida. Se provee en el componente de partida,
 * así que cada partida empieza con el chat vacío.
 */
@Injectable()
export class GameChat {
  private readonly sound = inject(SoundService);
  private nextId = 0;

  readonly messages = signal<ChatMessage[]>([]);
  /** Si el chat está a la vista; si no, se cuentan los mensajes sin leer. */
  readonly open = signal(false);
  private readonly lastSeen = signal(0);

  readonly unread = computed(() =>
    this.open() ? 0 : this.messages().filter((m) => m.id >= this.lastSeen() && m.from === 'them').length,
  );

  setOpen(open: boolean): void {
    this.open.set(open);
    if (open) this.lastSeen.set(this.nextId);
  }

  mine(author: string, text: string): void {
    this.push({ from: 'me', author, text });
  }

  theirs(author: string, text: string): void {
    this.push({ from: 'them', author, text });
    this.sound.play('message');
  }

  system(text: string): void {
    this.push({ from: 'system', author: '', text });
  }

  /** El bot "escribe" con una pequeña pausa, como una persona. */
  botSays(author: string, text: string, delay = 700 + Math.random() * 700): void {
    setTimeout(() => this.theirs(author, text), delay);
  }

  botReacts(author: string, event: BotChatEvent): void {
    this.botSays(author, botLineFor(event));
  }

  botReplies(author: string, to: string): void {
    this.botSays(author, botReplyTo(to), 900 + Math.random() * 900);
  }

  clear(): void {
    this.messages.set([]);
    this.lastSeen.set(this.nextId);
  }

  private push(message: Omit<ChatMessage, 'id'>): void {
    this.messages.update((list) => [...list, { ...message, id: this.nextId++ }].slice(-100));
    if (this.open()) this.lastSeen.set(this.nextId);
  }
}
