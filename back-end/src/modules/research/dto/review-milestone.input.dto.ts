import { IsUUID, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewMilestoneInputDto {
  @ApiProperty()
  @IsUUID()
  milestone_id: string;

  @ApiProperty()
  @IsString()
  comments: string;

  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'REVISION_NEEDED'] })
  @IsEnum(['APPROVED', 'REJECTED', 'REVISION_NEEDED'])
  status: 'APPROVED' | 'REJECTED' | 'REVISION_NEEDED';
}
