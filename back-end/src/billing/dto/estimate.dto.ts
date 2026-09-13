/**
 * estimate.dto.ts — the metrics shape shared by the public calculator and
 * the onboarding quote commit (onboarding-metrics.dto.ts extends this with
 * nothing but a session requirement — the metrics fields themselves must
 * never diverge, or a live-preview price and a committed quote price could
 * legitimately mean different things for the same input).
 */

import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  Max,
  Min,
} from 'class-validator';

export const PRICED_MODULES = ['research', 'fees', 'forum', 'analytics'] as const;
export type PricedModule = (typeof PRICED_MODULES)[number];

export class EstimateDto {
  @ApiProperty({ example: 1200, minimum: 1, maximum: 100_000 })
  @IsInt()
  @Min(1)
  @Max(100_000)
  student_count: number;

  @ApiProperty({ example: 80, minimum: 0, maximum: 10_000 })
  @IsInt()
  @Min(0)
  @Max(10_000)
  faculty_count: number;

  @ApiProperty({ example: ['research', 'analytics'], enum: PRICED_MODULES, isArray: true })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(PRICED_MODULES.length)
  @IsIn(PRICED_MODULES, { each: true })
  modules: PricedModule[];

  @ApiProperty({ example: 1, enum: [1, 2, 3] })
  @IsInt()
  @IsIn([1, 2, 3])
  term_years: 1 | 2 | 3;
}
