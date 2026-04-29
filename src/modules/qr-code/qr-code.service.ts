import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import * as crypto from 'node:crypto';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';

@Injectable()
export class QRService {
  private readonly issuedSignatures = new Map<string, Set<string>>();

  constructor(
    private readonly logger: PinoLogger,
    @Inject(CONFIG_SERVICE)
    private readonly config: ConfigService,
  ) {}

  private sign(ticketId: string, eventId: string): string {
    const secret = this.config.get('QR_SECRET');
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
