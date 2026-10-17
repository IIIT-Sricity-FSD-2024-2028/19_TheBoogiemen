/**
 * rate-card.ts — the numbers, and only the numbers.
 *
 * Pure data, deliberately separated from pricing.service.ts's arithmetic so
 * changing a price is a one-line diff in a file with no logic to misread.
 *
 * Versioned, never edited: a rate change is a new key (`v2`), `v1` stays
 * exactly as issued forever. Every quote stores which version priced it
 * (quotes.pricing_version), so a rate card change can never reprice a quote
 * already shown to a SPOC — see pricing.service.ts's docstring for why that
 * matters.
 *
 * All figures in paise (integer), matching amount_paise throughout this
 * module — see pricing.service.ts for why paise and not rupees.
 */

export interface RateBand {
  /** Inclusive. `Infinity` for the top band. */
  upTo: number;
  /** Paise per student per year, for students falling in this band. */
  paisePerStudent: number;
}

export interface RateCard {
  /**
   * Graduated bands, applied marginally like income tax brackets — never
   * flat tiers. See pricing.service.ts's bandedStudentCost() for why a flat
   * per-tier rate makes price *decrease* at a tier boundary, which a real
   * pricing algorithm must not do.
   */
  studentBands: RateBand[];
  /** Flat rate — faculty are heavier users but far fewer of them. */
  paisePerFaculty: number;
  /** Additive on the base — a module is worth more to a large college than
   *  a small one, without a second per-college-size rate table. 'core' is
   *  not listed: it is always included and contributes 0. */
  moduleWeights: Record<'research' | 'fees' | 'forum' | 'analytics', number>;
  /** Additive discount per extra committed year, stacked toward the cap. */
  termDiscount: Record<2 | 3, number>;
  /** No discount stack may exceed this, regardless of how many levers exist. */
  maxDiscount: number;
  /** Nothing is quoted below this, in paise per year. */
  floorPaise: number;
  /** Contract value rounds UP to this many paise — never down. */
  roundToPaise: number;
  /** Applied to the contract value after the floor and rounding. */
  gstRate: number;
}

export const RATE_CARDS: Record<string, RateCard> = {
  v1: {
    studentBands: [
      { upTo: 500, paisePerStudent: 12_000 }, // ₹120
      { upTo: 2_000, paisePerStudent: 9_000 }, // ₹90
      { upTo: 5_000, paisePerStudent: 7_000 }, // ₹70
      { upTo: Infinity, paisePerStudent: 5_500 }, // ₹55
    ],
    paisePerFaculty: 20_000, // ₹200
    moduleWeights: {
      research: 0.15,
      fees: 0.1,
      forum: 0.05,
      analytics: 0.2,
    },
    termDiscount: { 2: 0.05, 3: 0.1 },
    maxDiscount: 0.25,
    floorPaise: 2_500_000, // ₹25,000
    roundToPaise: 10_000, // ₹100
    gstRate: 0.18,
  },
};

export const CURRENT_RATE_CARD_VERSION = 'v1';

export function getRateCard(version: string): RateCard {
  const card = RATE_CARDS[version];
  if (!card) {
    // A quote referencing a version that no longer exists in this table is a
    // deployment mistake (a version was deleted, not just superseded — this
    // table is meant to be append-only), not something a caller can trigger
    // through normal use.
    throw new Error(`Unknown pricing version: ${version}`);
  }
  return card;
}
