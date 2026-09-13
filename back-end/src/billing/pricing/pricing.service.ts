/**
 * pricing.service.ts — metrics in, a priced breakdown out. Nothing else.
 *
 * Bare exported functions, not a NestJS service — same shape as
 * common/academic-rules.ts, the codebase's existing precedent for business
 * logic that has no business touching the database or the network. No
 * InMemoryDbService, no HTTP, no clock reads beyond what the caller passes
 * in. That is what makes every property below checkable in a plain Jest
 * spec with no NestJS TestingModule (pricing.spec.ts).
 *
 * Two call sites, one function: POST /billing/estimate (public, stateless,
 * "what would this cost") and the onboarding quote commit (persisted, the
 * number that is actually charged). They must never be two implementations
 * of the same algorithm — that is exactly how a preview price and a charged
 * price drift apart. Both call computeQuote(); the only difference is
 * whether the caller persists the result.
 */

import { CURRENT_RATE_CARD_VERSION, getRateCard, RateCard } from './rate-card';

export type Module = 'research' | 'fees' | 'forum' | 'analytics';
export type TermYears = 1 | 2 | 3;

export interface QuoteMetrics {
  student_count: number;
  faculty_count: number;
  modules: Module[];
  term_years: TermYears;
}

export interface QuoteLine {
  label: string;
  amount_paise: number;
}

export interface QuoteBreakdown {
  pricing_version: string;
  metrics: QuoteMetrics;
  /** Every priced line, in order — "why this number" without recomputing it. */
  lines: QuoteLine[];
  subtotal_paise: number;
  discount_rate: number;
  discount_paise: number;
  /** After discount, before the floor — kept for the breakdown even when the floor wins. */
  after_discount_paise: number;
  /** After the floor, after rounding up — the contract value GST applies to. */
  contract_paise: number;
  gst_paise: number;
  /** contract_paise + gst_paise. What the payment step actually charges. */
  payable_paise: number;
}

/**
 * Graduated bands, applied marginally — never a flat per-tier rate.
 *
 * A flat tier makes price *decrease* at a boundary: at ₹120/student, 500
 * students cost ₹60,000 and 501 cost ₹45,090 if the whole count re-prices at
 * the next tier's ₹90 rate. That is gameable (quote 501 to pay less than
 * 500) and it is not what "algorithmic pricing" is supposed to guarantee.
 * Marginal bands make the total strictly increasing in student_count, the
 * same way income tax brackets never let one more rupee of income reduce
 * take-home pay.
 */
function bandedStudentCost(studentCount: number, card: RateCard): number {
  let remaining = studentCount;
  let previousCap = 0;
  let total = 0;

  for (const band of card.studentBands) {
    if (remaining <= 0) break;
    const bandSize = band.upTo - previousCap;
    const inThisBand = Math.min(remaining, bandSize);
    total += inThisBand * band.paisePerStudent;
    remaining -= inThisBand;
    previousCap = band.upTo;
  }

  return total;
}

function moduleFactor(modules: Module[], card: RateCard): number {
  return 1 + modules.reduce((sum, m) => sum + (card.moduleWeights[m] ?? 0), 0);
}

/** Capped so no stack of levers can ever approach — let alone reach — 100%. */
function discountRate(termYears: TermYears, card: RateCard): number {
  const raw = termYears === 1 ? 0 : (card.termDiscount[termYears] ?? 0);
  return Math.min(raw, card.maxDiscount);
}

function roundUpTo(amountPaise: number, stepPaise: number): number {
  return Math.ceil(amountPaise / stepPaise) * stepPaise;
}

/**
 * The one place this application computes a subscription price. Every
 * property in pricing.spec.ts is a property of this function specifically.
 */
export function computeQuote(
  metrics: QuoteMetrics,
  pricingVersion: string = CURRENT_RATE_CARD_VERSION,
): QuoteBreakdown {
  const card = getRateCard(pricingVersion);

  const studentPaise = bandedStudentCost(metrics.student_count, card);
  const facultyPaise = metrics.faculty_count * card.paisePerFaculty;
  const base = studentPaise + facultyPaise;

  const factor = moduleFactor(metrics.modules, card);
  const subtotal = Math.round(base * factor);

  const rate = discountRate(metrics.term_years, card);
  const discountPaise = Math.round(subtotal * rate);
  const afterDiscount = subtotal - discountPaise;

  const floored = Math.max(afterDiscount, card.floorPaise);
  const contract = roundUpTo(floored, card.roundToPaise);
  const gst = Math.round(contract * card.gstRate);
  const payable = contract + gst;

  const lines: QuoteLine[] = [
    { label: `Students (${metrics.student_count})`, amount_paise: studentPaise },
    { label: `Faculty (${metrics.faculty_count})`, amount_paise: facultyPaise },
  ];
  for (const m of metrics.modules) {
    lines.push({
      label: `Module: ${m}`,
      amount_paise: Math.round(base * card.moduleWeights[m]),
    });
  }
  if (discountPaise > 0) {
    lines.push({ label: `Multi-year discount (${Math.round(rate * 100)}%)`, amount_paise: -discountPaise });
  }
  if (floored > afterDiscount) {
    lines.push({ label: 'Minimum contract value applied', amount_paise: floored - afterDiscount });
  }
  lines.push({ label: 'GST (18%)', amount_paise: gst });

  return {
    pricing_version: pricingVersion,
    metrics,
    lines,
    subtotal_paise: subtotal,
    discount_rate: rate,
    discount_paise: discountPaise,
    after_discount_paise: afterDiscount,
    contract_paise: contract,
    gst_paise: gst,
    payable_paise: payable,
  };
}
