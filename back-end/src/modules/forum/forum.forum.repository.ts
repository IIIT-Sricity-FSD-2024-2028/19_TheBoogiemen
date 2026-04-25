import { Injectable } from '@nestjs/common';
import { FORUM_POST, FORUM_REPLY, TOPIC, RESEARCH_DOMAINS } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ForumRepository {
  public posts: FORUM_POST[] = [];
  public replies: FORUM_REPLY[] = [];
  public topics: TOPIC[] = [];
  public domains: RESEARCH_DOMAINS[] = [];

  constructor() {
    this.topics.push(
      { topic_id: SEED.TOPICS[0], course_id: SEED.COURSES[0], topic_name: 'Quantum Logic', domain_id: 'domain-auth-1' },
      { topic_id: SEED.TOPICS[1], course_id: SEED.COURSES[1], topic_name: 'Systems Design', domain_id: 'domain-auth-2' }
    );
    this.domains.push(
      { faculty_id: SEED.FACULTY[0], domain_id: 'domain-auth-1' }
    );
    
    const post1 = uuidv4();
    const post2 = uuidv4();
    const post3 = uuidv4();

    this.posts.push(
      { id: post1, topic_id: SEED.TOPICS[0], author_id: SEED.STUDENTS[0], content: 'Initial question on logic', created_at: new Date().toISOString(), replies_count: 2 },
      { id: post2, topic_id: SEED.TOPICS[1], author_id: SEED.STUDENTS[1], content: 'Need help with architecture', created_at: new Date().toISOString(), replies_count: 0 },
      { id: post3, topic_id: SEED.TOPICS[0], author_id: SEED.FACULTY[0], content: 'Announcement regarding logic', created_at: new Date().toISOString(), replies_count: 0 }
    );

    this.replies.push(
      { id: uuidv4(), post_id: post1, author_id: SEED.STUDENTS[1], content: 'I think it works like this...', created_at: new Date().toISOString() },
      { id: uuidv4(), post_id: post1, author_id: SEED.FACULTY[0], content: 'Correct, that is the way.', created_at: new Date().toISOString() }
    );
  }

  async findTopic(id: string): Promise<TOPIC | undefined> { return this.topics.find(t => t.topic_id === id); }
  async createPost(data: FORUM_POST): Promise<FORUM_POST> { this.posts.push(data); return data; }
  async findPost(id: string): Promise<FORUM_POST | undefined> { return this.posts.find(p => p.id === id); }
  async createReply(data: FORUM_REPLY): Promise<FORUM_REPLY> { this.replies.push(data); return data; }
  async incrementReplyCount(postId: string) { const p = await this.findPost(postId); if (p) p.replies_count++; }
  async findDomainForFaculty(facultyId: string) { return this.domains.find(d => d.faculty_id === facultyId); }
  async findTopicsByDomain(domainId: string) { return this.topics.filter(t => t.domain_id === domainId); }
  async findPostsByTopics(topicIds: string[]) { return this.posts.filter(p => topicIds.includes(p.topic_id)); }
}
