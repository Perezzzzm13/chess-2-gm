import { Component, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { Icon } from '../icon/icon';
import { ChatMessage, MAX_CHAT_LENGTH } from './chat.models';

/** Chat de partida: burbujas, frases rápidas y campo de texto. */
@Component({
  selector: 'app-chat',
  imports: [Icon],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');

  readonly messages = input.required<ChatMessage[]>();
  readonly quickPhrases = input<string[]>([]);
  readonly disabled = input(false);
  readonly send = output<string>();

  readonly draft = signal('');
  readonly maxLength = MAX_CHAT_LENGTH;

  constructor() {
    // Siempre a la vista el último mensaje
    effect(() => {
      this.messages();
      const el = this.list()?.nativeElement;
      if (el) queueMicrotask(() => (el.scrollTop = el.scrollHeight));
    });
  }

  submit(text = this.draft()): void {
    const clean = text.trim().slice(0, MAX_CHAT_LENGTH);
    if (!clean || this.disabled()) return;
    this.send.emit(clean);
    this.draft.set('');
  }
}
