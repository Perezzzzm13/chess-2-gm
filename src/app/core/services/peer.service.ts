import { inject, Injectable, signal } from '@angular/core';
import Peer, { DataConnection } from 'peerjs';
import { Subject } from 'rxjs';
import { Color, ColorChoice, Uci } from '../models/chess.models';
import { PlayerInfo } from '../models/game.models';
import { opposite } from '../chess/chess-utils';
import { ProfileService } from './profile.service';
import { VariantId } from '../../data/variants';

export type PeerMessage =
  | { type: 'hello'; player: PlayerInfo }
  | { type: 'start'; guestColor: Color; host: PlayerInfo; variant?: VariantId }
  | { type: 'move'; uci: Uci; ply: number }
  | { type: 'resign' }
  | { type: 'draw-offer' }
  | { type: 'draw-answer'; accepted: boolean }
  | { type: 'rematch-offer' }
  | { type: 'rematch-accept' }
  | { type: 'chat'; text: string };

export type PeerStatus = 'idle' | 'waiting' | 'connecting' | 'playing' | 'disconnected' | 'error';

const ID_PREFIX = 'chess-to-gm-';

/**
 * Partidas entre amigos mediante WebRTC (PeerJS). No necesita servidor propio:
 * el servidor público de PeerJS solo pone en contacto a los dos navegadores.
 */
@Injectable({ providedIn: 'root' })
export class PeerService {
  private readonly profile = inject(ProfileService);
  private peer?: Peer;
  private connection?: DataConnection;
  private hostColorChoice: ColorChoice = 'random';

  readonly status = signal<PeerStatus>('idle');
  readonly role = signal<'host' | 'guest' | null>(null);
  readonly roomCode = signal<string | null>(null);
  readonly myColor = signal<Color>('w');
  readonly opponent = signal<PlayerInfo | null>(null);
  /** Modo de juego que elige el anfitrión. */
  readonly variant = signal<VariantId>('clasico');
  readonly error = signal<string | null>(null);
  /** Se incrementa cada vez que empieza una partida nueva (incluidas las revanchas). */
  readonly gameNumber = signal(0);
  readonly messages = new Subject<PeerMessage>();

  host(colorChoice: ColorChoice, variant: VariantId = 'clasico'): void {
    this.leave();
    this.hostColorChoice = colorChoice;
    this.variant.set(variant);
    this.role.set('host');
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.peer = new Peer(ID_PREFIX + code);
    this.peer.on('open', () => {
      this.roomCode.set(code);
      this.status.set('waiting');
    });
    this.peer.on('connection', (conn) => {
      if (this.connection?.open) {
        conn.close();
        return;
      }
      this.bind(conn);
    });
    this.peer.on('error', (err) => this.fail(err.type === 'unavailable-id' ? 'Código en uso, inténtalo de nuevo.' : err.message));
  }

  join(code: string): void {
    this.leave();
    this.role.set('guest');
    this.roomCode.set(code.toUpperCase());
    this.status.set('connecting');
    this.peer = new Peer();
    this.peer.on('open', () => {
      const conn = this.peer!.connect(ID_PREFIX + code.toUpperCase(), { reliable: true });
      this.bind(conn);
      conn.on('open', () => this.send({ type: 'hello', player: this.me() }));
    });
    this.peer.on('error', (err) =>
      this.fail(err.type === 'peer-unavailable' ? 'No se encuentra la partida. ¿Sigue abierta en el otro dispositivo?' : err.message),
    );
  }

  send(message: PeerMessage): void {
    if (this.connection?.open) this.connection.send(message);
  }

  /** El anfitrión inicia una revancha intercambiando los colores. */
  startRematch(): void {
    if (this.role() !== 'host') return;
    this.startGame(opposite(this.myColor()));
  }

  inviteLink(): string {
    const base = window.location.href.split('#')[0];
    return `${base}#/amigos/unirse/${this.roomCode()}`;
  }

  leave(): void {
    this.connection?.close();
    this.peer?.destroy();
    this.connection = undefined;
    this.peer = undefined;
    this.status.set('idle');
    this.role.set(null);
    this.roomCode.set(null);
    this.opponent.set(null);
    this.error.set(null);
  }

  private bind(conn: DataConnection): void {
    this.connection = conn;
    conn.on('data', (data) => this.handle(data as PeerMessage));
    conn.on('close', () => this.status.set('disconnected'));
    conn.on('error', () => this.status.set('disconnected'));
  }

  private handle(message: PeerMessage): void {
    if (message.type === 'hello' && this.role() === 'host') {
      this.opponent.set(message.player);
      const hostColor: Color =
        this.hostColorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : this.hostColorChoice;
      this.startGame(hostColor);
      return;
    }
    if (message.type === 'start' && this.role() === 'guest') {
      this.opponent.set(message.host);
      this.myColor.set(message.guestColor);
      this.variant.set(message.variant ?? 'clasico');
      this.status.set('playing');
      this.gameNumber.update((n) => n + 1);
      return;
    }
    this.messages.next(message);
  }

  private startGame(hostColor: Color): void {
    this.myColor.set(hostColor);
    this.send({ type: 'start', guestColor: opposite(hostColor), host: this.me(), variant: this.variant() });
    this.status.set('playing');
    this.gameNumber.update((n) => n + 1);
  }

  private me(): PlayerInfo {
    return this.profile.playerInfo();
  }

  private fail(message: string): void {
    this.error.set(message);
    this.status.set('error');
  }
}
