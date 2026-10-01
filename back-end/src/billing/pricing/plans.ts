/**
 * Named plan presets shown on the public pricing page. Prices are not stored
 * here: each preset is priced by computeQuote() with the current rate card,
 * so the landing page, the calculator and the onboarding quote always agree.
 */
import { computeQuote, QuoteMetrics } from './pricing.service';

export interface PlanPreset {
  key: 'starter' | 'growth' | 'enterprise';
  name: string;
  tagline: string;
  audience: string;
  highlighted: boolean;
  metrics: QuoteMetrics;
  features: string[];
}

export const PLAN_PRESETS: PlanPreset[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'Core academics for a single campus',
    audience: 'Up to 500 students',
    highlighted: false,
    metrics: { student_count: 500, faculty_count: 30, modules: [], term_years: 1 },
    features: ['Attendance and timetable', 'Courses, assessments and marks', 'Leave and approvals', 'Student, faculty and HOD portals', 'Email support'],
  },
  {
    key: 'growth',
    name: 'Growth',
    tagline: 'Research tracking and analytics',
    audience: 'Around 2,000 students',
    highlighted: true,
    metrics: { student_count: 2000, faculty_count: 120, modules: ['research', 'analytics'], term_years: 1 },
    features: ['Everything in Starter', 'BTP and research projects', 'OBE analytics and at-risk reports', 'Director and finance portals', 'Priority support'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'Every module, multi-year contract',
    audience: '5,000+ students',
    highlighted: false,
    metrics: { student_count: 5000, faculty_count: 300, modules: ['research', 'fees', 'forum', 'analytics'], term_years: 3 },
    features: ['Everything in Growth', 'Fees and finance module', 'Discussion forum', '3-year term discount', 'Dedicated support manager'],
  },
];

export function pricedPlans() {
  return PLAN_PRESETS.map((plan) => {
    const quote = computeQuote(plan.metrics);
    return {
      ...plan,
      // The rate card is priced per student per year, so payable_paise is the
      // yearly amount (a multi-year term lowers it via the term discount).
      per_year_paise: quote.payable_paise,
      contract_total_paise: quote.payable_paise * plan.metrics.term_years,
      per_student_month_paise: Math.round(quote.payable_paise / 12 / plan.metrics.student_count),
      quote,
    };
  });
}
