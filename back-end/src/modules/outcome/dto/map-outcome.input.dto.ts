import { IsUUID, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MapOutcomeInputDto {
  @ApiProperty()
  @IsUUID()
  assessment_id: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID(undefined, { each: true })
  outcome_ids: string[];

  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  weightages: number[];
}
