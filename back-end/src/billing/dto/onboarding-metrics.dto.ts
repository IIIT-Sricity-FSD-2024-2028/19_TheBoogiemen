/**
 * onboarding-metrics.dto.ts — stage 2's commit body.
 *
 * No new fields over EstimateDto on purpose: the live-preview calculator and
 * the persisted quote must price identically shaped input, or a number shown
 * while typing and the number actually committed could legitimately diverge
 * for reasons that have nothing to do with the algorithm changing.
 */

import { EstimateDto } from './estimate.dto';

export class OnboardingMetricsDto extends EstimateDto {}
