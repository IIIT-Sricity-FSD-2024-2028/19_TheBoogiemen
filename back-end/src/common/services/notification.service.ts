import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  notify(recipientId: string, message: string): void {
    console.log('[NOTIFY] to:', recipientId, 'msg:', message);
  }
}
