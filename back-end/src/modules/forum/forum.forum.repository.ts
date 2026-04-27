import { Injectable } from '@nestjs/common';
import { FORUM_POST, FORUM_REPLY, TOPIC, RESEARCH_DOMAINS } from '../../common/types/interfaces';
import { MOCK_FORUM_POSTS, MOCK_FORUM_REPLIES, MOCK_TOPICS, MOCK_RESEARCH_DOMAINS } from '../../common/types/mock-data';

@Injectable()
export class ForumRepository {
  public posts: FORUM_POST[] = MOCK_FORUM_POSTS;
  public replies: FORUM_REPLY[] = MOCK_FORUM_REPLIES;
  public topics: TOPIC[] = MOCK_TOPICS;
  public domains: RESEARCH_DOMAINS[] = MOCK_RESEARCH_DOMAINS;

  constructor() {}

  async findTopic(id: string): Promise<TOPIC | undefined> { return this.topics.find(t => t.topic_id === id); }
  async createPost(data: FORUM_POST): Promise<FORUM_POST> { this.posts.push(data); return data; }
  async findPost(id: string): Promise<FORUM_POST | undefined> { return this.posts.find(p => p.id === id); }
  async createReply(data: FORUM_REPLY): Promise<FORUM_REPLY> { this.replies.push(data); return data; }
  async incrementReplyCount(postId: string) { const p = await this.findPost(postId); if (p) p.replies_count++; }
  async findDomainForFaculty(facultyId: string) { return this.domains.find(d => d.faculty_id === facultyId); }
  async findTopicsByDomain(domainId: string) { return this.topics.filter(t => t.domain_id === domainId); }
  async findPostsByTopics(topicIds: string[]) { return this.posts.filter(p => topicIds.includes(p.topic_id)); }

  async findAllPosts(): Promise<FORUM_POST[]> {
    return this.posts;
  }

  async updatePost(id: string, data: Partial<FORUM_POST>): Promise<FORUM_POST | null> {
    const idx = this.posts.findIndex(p => p.id === id);
    if(idx > -1) { Object.assign(this.posts[idx], data); return this.posts[idx]; }
    return null;
  }

  async deletePost(id: string): Promise<void> {
    const idx = this.posts.findIndex(p => p.id === id);
    if(idx > -1) this.posts.splice(idx, 1);
  }

  async deleteReply(id: string): Promise<void> {
    const idx = this.replies.findIndex(r => r.id === id);
    if(idx > -1) this.replies.splice(idx, 1);
  }
}
