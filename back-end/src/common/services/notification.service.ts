import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class NotificationService {
  constructor(
    @InjectPinoLogger(NotificationService.name) private readonly logger: PinoLogger,
  ) {}

  /**
   * NOTE: still a stub. This logs the intent to notify; nothing is delivered to
   * the recipient. Structured logging does not change that — a real transport is
   * a separate piece of work.
   */
  notify(recipientId: string, message: string): void {
    this.logger.info({ recipientId, message, delivered: false }, 'Notification raised');
  }
}
