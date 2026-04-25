import { Controller, Post, Get, Body, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ForumService } from './forum.forum.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePostInputDto } from './dto/create-post.input.dto';
import { ReplyInputDto } from './dto/reply.input.dto';
import { PostOutputDto } from './dto/post.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { SEED } from '../../common/types/seed-constants';
import { MOCK_FORUM_POSTS, MOCK_FORUM_REPLIES, MOCK_TOPICS } from '../../common/types/mock-data';

@ApiTags('Forum')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post()
  @SetMetadata('roles', ['student', 'faculty'])
  @ApiBody({ type: CreatePostInputDto })
  @ApiResponse({ status: 201, type: PostOutputDto })
  async createPost(@Body() dto: CreatePostInputDto) {
    // Mock user context extraction
    const userId = SEED.STUDENTS[0]; 
    const data = await this.forumService.createPost(userId, dto);
    return new BaseResponseDto(true, data, 'post created');
  }

  @Post(':postId/reply')
  @SetMetadata('roles', ['student', 'faculty'])
  @ApiParam({ name: 'postId', description: 'Post ID' })
  @ApiBody({ type: ReplyInputDto })
  @ApiResponse({ status: 201 })
  async replyToPost(@Param('postId') postId: string, @Body() dto: ReplyInputDto) {
    dto.post_id = postId;
    // Mock user context extraction
    const userId = SEED.STUDENTS[0];
    const data = await this.forumService.replyToPost(userId, dto);
    return new BaseResponseDto(true, data, 'reply created');
  }

  @Get('domain/:facultyId')
  @SetMetadata('roles', ['faculty'])
  @ApiParam({ name: 'facultyId', description: 'Faculty ID' })
  @ApiResponse({ status: 200, type: [PostOutputDto] })
  async getDomainFilteredPosts(@Param('facultyId') facultyId: string) {
    const data = await this.forumService.getDomainFilteredPosts(facultyId);
    return new BaseResponseDto(true, data, 'posts fetched');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      posts: MOCK_FORUM_POSTS,
      replies: MOCK_FORUM_REPLIES,
      topics: MOCK_TOPICS
    }, 'mock data fetched');
  }
}
