import { Injectable, NotFoundException } from '@nestjs/common';
import { ForumRepository } from './forum.forum.repository';
import { CreatePostInputDto } from './dto/create-post.input.dto';
import { ReplyInputDto } from './dto/reply.input.dto';
import { PostOutputDto } from './dto/post.output.dto';
import { v4 as uuidv4 } from 'uuid';
import { FORUM_REPLY } from '../../common/types/interfaces';

@Injectable()
export class ForumService {
  constructor(private readonly forumRepo: ForumRepository) {}

  async createPost(userId: string, dto: CreatePostInputDto): Promise<PostOutputDto> {
    const topic = await this.forumRepo.findTopic(dto.topic_id);
    if (!topic) throw new NotFoundException('Topic not found');

    const post = await this.forumRepo.createPost({
      id: uuidv4(),
      topic_id: dto.topic_id,
      author_id: userId,
      content: dto.content,
      created_at: new Date().toISOString(),
      replies_count: 0
    });

    return post;
  }

  async replyToPost(userId: string, dto: ReplyInputDto): Promise<FORUM_REPLY> {
    const post = await this.forumRepo.findPost(dto.post_id);
    if (!post) throw new NotFoundException('Post not found');

    const reply = await this.forumRepo.createReply({
      id: uuidv4(),
      post_id: dto.post_id,
      author_id: userId,
      content: dto.content,
      created_at: new Date().toISOString()
    });

    await this.forumRepo.incrementReplyCount(dto.post_id);

    return reply;
  }

  async getDomainFilteredPosts(facultyId: string): Promise<PostOutputDto[]> {
    const domain = await this.forumRepo.findDomainForFaculty(facultyId);
    if (!domain) return [];

    const topics = await this.forumRepo.findTopicsByDomain(domain.domain_id);
    const posts = await this.forumRepo.findPostsByTopics(topics.map(t => t.topic_id));

    return posts;
  }

  async getAllPosts() {
    return this.forumRepo.findAllPosts();
  }

  async getPostById(id: string) {
    const post = await this.forumRepo.findPost(id);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async updatePost(id: string, dto: any) {
    const post = await this.forumRepo.findPost(id);
    if (!post) throw new NotFoundException('Post not found');
    
    return this.forumRepo.updatePost(id, {
      content: dto.content || post.content
    });
  }

  async patchPost(id: string, dto: any) {
    const post = await this.forumRepo.findPost(id);
    if (!post) throw new NotFoundException('Post not found');
    
    return this.forumRepo.updatePost(id, dto);
  }

  async deletePost(id: string) {
    const post = await this.forumRepo.findPost(id);
    if (!post) throw new NotFoundException('Post not found');
    
    await this.forumRepo.deletePost(id);
  }

  async deleteReply(id: string) {
    await this.forumRepo.deleteReply(id);
  }
}
