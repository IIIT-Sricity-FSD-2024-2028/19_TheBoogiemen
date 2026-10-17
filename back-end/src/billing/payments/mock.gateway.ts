/**
 * mock.gateway.ts — the only PaymentGateway implementation this pass builds.
 *
 * Mints an order id and nothing else — no network call, no external
 * service, no real money ever moves. The mock checkout screen
 * (onboarding.html) shows this order alongside the quoted amount, then the
 * SPOC-to-be clicks one of two buttons: "Simulate Successful Payment" (hits
 * POST .../payments/confirm) or "Simulate Failure" (hits .../payments/fail).
 * Neither button is this class's concern — this class only ever opens an
 * order; onboarding.service.ts decides what a captured or failed one means.
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentGateway, PaymentOrder } from './payment-gateway.interface';

@Injectable()
export class MockGateway implements PaymentGateway {
  async createOrder(
    _amountPaise: number,
    _metadata: Record<string, unknown>,
  ): Promise<PaymentOrder> {
    return { order_id: `mock_${randomUUID()}` };
  }
}
