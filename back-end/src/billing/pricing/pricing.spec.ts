/**
 * pricing.spec.ts — the properties computeQuote() must never violate.
 *
 * A bug here is not "wrong number on screen" — it is either an SPOC paying
 * more than the algorithm should charge, or the platform charging less than
 * it meant to at scale. Each test below is one property named in
 * pricing.service.ts's own docstring or ONBOARDING_PIPELINE_PLAN.md §3,
 * checked directly rather than inferred from one worked example.
 */

import { computeQuote, QuoteMetrics } from './pricing.service';
import { CURRENT_RATE_CARD_VERSION } from './rate-card';

const base = (overrides: Partial<QuoteMetrics> = {}): QuoteMetrics => ({
  student_count: 300,
  faculty_count: 20,
  modules: [],
  term_years: 1,
  ...overrides,
});

describe('computeQuote', () => {
  it('is deterministic — identical inputs, identical output, every field', () => {
    const a = computeQuote(base());
    const b = computeQuote(base());
    expect(a).toEqual(b);
  });

  it('stamps every quote with the version that priced it', () => {
    expect(computeQuote(base()).pricing_version).toBe(CURRENT_RATE_CARD_VERSION);
  });

  describe('monotonicity — more of anything never costs less', () => {
    it('more students never reduces the payable amount', () => {
      const counts = [1, 100, 499, 500, 501, 1000, 2000, 2001, 5000, 5001, 10000];
      const payables = counts.map((student_count) => computeQuote(base({ student_count })).payable_paise);
      for (let i = 1; i < payables.length; i++) {
        expect(payables[i]).toBeGreaterThanOrEqual(payables[i - 1]);
      }
    });

    it('more faculty never reduces the payable amount', () => {
      const a = computeQuote(base({ faculty_count: 20 })).payable_paise;
      const b = computeQuote(base({ faculty_count: 21 })).payable_paise;
      expect(b).toBeGreaterThan(a);
    });

    it('adding a module never reduces the payable amount', () => {
      const none = computeQuote(base({ modules: [] })).payable_paise;
      const one = computeQuote(base({ modules: ['research'] })).payable_paise;
      const two = computeQuote(base({ modules: ['research', 'analytics'] })).payable_paise;
      expect(one).toBeGreaterThan(none);
      expect(two).toBeGreaterThan(one);
    });

    it('a longer term never reduces the pre-discount subtotal it discounts from', () => {
      // The payable amount itself may fall as the discount grows — that is
      // the discount working as intended. What must never move is the
      // subtotal the discount is taken off, which depends only on
      // students/faculty/modules, not term length.
      const s1 = computeQuote(base({ term_years: 1 })).subtotal_paise;
      const s3 = computeQuote(base({ term_years: 3 })).subtotal_paise;
      expect(s3).toBe(s1);
    });
  });

  describe('graduated bands, not flat tiers', () => {
    it('crossing a band boundary strictly increases price — no cliff', () => {
      const at500 = computeQuote(base({ student_count: 500, term_years: 1 })).subtotal_paise;
      const at501 = computeQuote(base({ student_count: 501, term_years: 1 })).subtotal_paise;
      expect(at501).toBeGreaterThan(at500);
    });

    it('only the students inside a band are charged that band\'s rate', () => {
      // 501 students: 500 at ₹120 + 1 at ₹90, not 501 at ₹90.
      const cheaperWrongWay = 501 * 9_000; // what a flat-tier model would charge
      const { subtotal_paise } = computeQuote(base({ student_count: 501, faculty_count: 0 }));
      expect(subtotal_paise).toBeGreaterThan(cheaperWrongWay);
      expect(subtotal_paise).toBe(500 * 12_000 + 1 * 9_000);
    });
  });

  describe('discount cap', () => {
    it('never exceeds the configured maximum, even at the richest lever combination', () => {
      const { discount_rate } = computeQuote(base({ term_years: 3 }));
      expect(discount_rate).toBeLessThanOrEqual(0.25);
    });

    it('a 1-year term carries no discount', () => {
      expect(computeQuote(base({ term_years: 1 })).discount_rate).toBe(0);
    });
  });

  describe('floor', () => {
    it('a tiny college is lifted to the minimum contract value', () => {
      const { contract_paise, after_discount_paise } = computeQuote(
        base({ student_count: 5, faculty_count: 1 }),
      );
      expect(after_discount_paise).toBeLessThan(2_500_000);
      expect(contract_paise).toBe(2_500_000);
    });

    it('a large college is priced on the algorithm, not the floor', () => {
      const { contract_paise } = computeQuote(base({ student_count: 3000, faculty_count: 150 }));
      expect(contract_paise).toBeGreaterThan(2_500_000);
    });
  });

  describe('rounding', () => {
    it('the contract value is always a whole ₹100 — and rounds UP, never down', () => {
      for (const student_count of [1, 37, 300, 1234, 4999]) {
        const { contract_paise, after_discount_paise } = computeQuote(base({ student_count }));
        expect(contract_paise % 10_000).toBe(0);
        expect(contract_paise).toBeGreaterThanOrEqual(after_discount_paise);
      }
    });
  });

  it('GST is 18% of the contract value, and payable is contract + GST', () => {
    const { contract_paise, gst_paise, payable_paise } = computeQuote(base());
    expect(gst_paise).toBe(Math.round(contract_paise * 0.18));
    expect(payable_paise).toBe(contract_paise + gst_paise);
  });

  it('the breakdown carries a line per priced component, for "why this number"', () => {
    const { lines } = computeQuote(base({ modules: ['research', 'fees'], term_years: 2 }));
    const labels = lines.map((l) => l.label);
    expect(labels.some((l) => l.startsWith('Students'))).toBe(true);
    expect(labels.some((l) => l.startsWith('Faculty'))).toBe(true);
    expect(labels).toContain('Module: research');
    expect(labels).toContain('Module: fees');
    expect(labels.some((l) => l.includes('discount'))).toBe(true);
    expect(labels).toContain('GST (18%)');
  });
});
