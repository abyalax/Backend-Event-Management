import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import crypto from 'node:crypto';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { QRConfig } from './qr.interface';

@Injectable()
export class QRService {
  private readonly issuedSignatures = new Map<string, Set<string>>();

  constructor(
    private readonly logger: PinoLogger,
    @Inject(CONFIG_PROVIDER.QR)
    private readonly config: QRConfig,
  ) {}

  private sign(ticketId: string, eventId: string): string {
    const secret = this.config.secret;
    const nonce = crypto.randomUUID();
    return crypto.createHmac('sha256', secret).update(`${ticketId}:${eventId}:${nonce}`).digest('hex');
  }

  private key(ticketId: string, eventId: string): string {
    return `${ticketId}:${eventId}`;
  }

  generate(ticketId: string, eventId: string): Promise<string> {
    const signature = this.sign(ticketId, eventId);
    const key = this.key(ticketId, eventId);

    const signatures = this.issuedSignatures.get(key) ?? new Set<string>();
    signatures.add(signature);
    this.issuedSignatures.set(key, signatures);

    const payload = Buffer.from(`${ticketId}:${eventId}:${signature}`).toString('base64');
    this.logger.info({ ticketId, eventId }, 'Generating QR code');
    return Promise.resolve(payload);
  }

  revoke(encoded: string): { revoked: boolean; ticketId?: string; eventId?: string } {
    const decoded = this.decode(encoded);

    if (!decoded.valid || !decoded.ticketId || !decoded.eventId) {
      return { revoked: false };
    }

    const key = this.key(decoded.ticketId, decoded.eventId);
    const signatures = this.issuedSignatures.get(key);

    if (!signatures) {
      return { revoked: false };
    }

    const decodedPayload = Buffer.from(encoded, 'base64').toString('utf-8');
    const [, , signature] = decodedPayload.split(':');
    const removed = signatures.delete(signature);

    if (signatures.size === 0) this.issuedSignatures.delete(key);

    if (!removed) return { revoked: false };

    this.logger.info({ ticketId: decoded.ticketId, eventId: decoded.eventId }, 'Revoked QR code');

    return { revoked: true, ticketId: decoded.ticketId, eventId: decoded.eventId };
  }

  decode(encoded: string): { ticketId: string; eventId: string; valid: boolean } {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const [ticketId, eventId, signature] = decoded.split(':');

      if (!ticketId || !eventId || !signature) {
        return { ticketId: '', eventId: '', valid: false };
      }

      const valid = this.issuedSignatures.get(this.key(ticketId, eventId))?.has(signature) ?? false;
      return { ticketId, eventId, valid };
    } catch (error) {
      this.logger.warn({ encoded, error: error instanceof Error ? error.message : String(error) }, 'Failed to decode QR payload');
      return { ticketId: '', eventId: '', valid: false };
    }
  }
}
