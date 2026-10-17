/**
 * payment-gateway.interface.ts — the swap point for a real gateway later.
 *
 * Mirrors the DATA_STORE=memory|postgres precedent already in this codebase:
 * one interface, one env-selectable implementation live today (MockGateway),
 * a second implementation (Razorpay, say) is a new class against this same
 * interface, not a rewrite of anything that calls it.
 *
 * verifySignature() is deliberately absent. A real gateway's webhook is
 * signed because it arrives from a third party over the open internet; ours
 * is a same-origin button click on our own mock checkout screen, already
 * covered by the SameSite=Strict session cookie the rest of this app relies
 * on for exactly this same-origin-only guarantee. Adding a signature check
 * with nothing on the other end to forge would be simulating a security
 * boundary that does not exist yet, not building one.
 */

export interface PaymentOrder {
  order_id: string;
}

export interface PaymentGateway {
  createOrder(amountPaise: number, metadata: Record<string, unknown>): Promise<PaymentOrder>;
}

/** DI token — see billing.module.ts for the current binding (MockGateway only). */
export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
