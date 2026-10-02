import { Component, computed, effect, inject, input, linkedSignal, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import QRCode from 'qrcode';
import { ColorChoice } from '../../core/models/chess.models';
import { PeerService } from '../../core/services/peer.service';
import { variantById, VariantId } from '../../data/variants';
import { Icon } from '../../shared/components/icon/icon';
import { VariantPicker } from '../../shared/components/variant-picker/variant-picker';

@Component({
  selector: 'app-friends',
  imports: [Icon, VariantPicker],
  templateUrl: './friends.html',
  styleUrl: './friends.scss',
})
export class Friends implements OnInit {
  private readonly router = inject(Router);
  readonly peer = inject(PeerService);

  /** Código de la partida cuando se entra desde un enlace de invitación. */
  readonly code = input<string>();

  readonly color = signal<ColorChoice>('random');
  readonly variantParam = input<string>(undefined, { alias: 'variante' });
  readonly variant = linkedSignal<VariantId>(() => variantById(this.variantParam()).id);
  readonly qr = signal<string | null>(null);
  readonly copied = signal(false);
  readonly manualCode = signal('');

  readonly link = computed(() => (this.peer.roomCode() && this.peer.role() === 'host' ? this.peer.inviteLink() : null));
  readonly isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  readonly canShare = typeof navigator.share === 'function';

  readonly colorOptions: { value: ColorChoice; label: string }[] = [
    { value: 'w', label: 'Blancas' },
    { value: 'random', label: 'Al azar' },
    { value: 'b', label: 'Negras' },
  ];

  constructor() {
    effect(() => {
      if (this.peer.status() === 'playing') this.router.navigate(['/amigos/partida']);
    });
    effect(() => {
      const link = this.link();
      if (!link) {
        this.qr.set(null);
        return;
      }
      QRCode.toDataURL(link, { margin: 1, width: 280, color: { dark: '#4a0712', light: '#fff6e0' } }).then((url) => this.qr.set(url));
    });
  }

  ngOnInit(): void {
    const code = this.code();
    if (code) this.peer.join(code);
    else if (this.peer.status() === 'disconnected' || this.peer.status() === 'error') this.peer.leave();
  }

  create(): void {
    this.peer.host(this.color(), this.variant());
  }

  joinManual(): void {
    const code = this.manualCode().trim();
    if (code) this.router.navigate(['/amigos/unirse', code.toUpperCase()]);
  }

  async copy(): Promise<void> {
    const link = this.link();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.copied.set(false);
    }
  }

  share(): void {
    const link = this.link();
    if (link) navigator.share({ title: 'Chess to GM', text: '¡Te reto a una partida de ajedrez!', url: link }).catch(() => undefined);
  }

  cancel(): void {
    this.peer.leave();
    if (this.code()) this.router.navigate(['/amigos']);
  }
}
