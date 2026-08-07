import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../core/entities/api-key.entity';
import { User } from '../core/entities/user.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class B2bService {
  constructor(
    @InjectRepository(ApiKey) private apiKeyRepository: Repository<ApiKey>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async generateApiKey(tenantId: string, name: string) {
    if (!name) throw new BadRequestException('API Key name is required');

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const fullKey = `bp_live_${rawToken}`;
    
    // Hash it for storage
    const keyHash = await bcrypt.hash(fullKey, 10);
    const keyPrefix = fullKey.substring(0, 16); // e.g. bp_live_1234abcd

    const apiKey = this.apiKeyRepository.create({
      name,
      keyPrefix,
      keyHash,
      organizationId: tenantId,
    });
    
    await this.apiKeyRepository.save(apiKey);

    return {
      success: true,
      message: 'API Key generated successfully. Please copy it now; you will not be able to see it again.',
      apiKey: fullKey,
      id: apiKey.id,
    };
  }

  async listApiKeys(tenantId: string) {
    return this.apiKeyRepository.find({
      where: { organizationId: tenantId, isActive: true },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    });
  }

  async revokeApiKey(tenantId: string, keyId: string) {
    const key = await this.apiKeyRepository.findOne({ where: { id: keyId, organizationId: tenantId } });
    if (!key) throw new BadRequestException('API Key not found');
    
    key.isActive = false;
    await this.apiKeyRepository.save(key);
    return { success: true, message: 'API Key revoked' };
  }

  // Example of a B2B endpoint that consumes tenant data
  async getTenantUsers(tenantId: string) {
    return this.userRepository.createQueryBuilder('user')
      .innerJoin('user.memberships', 'membership')
      .where('membership.organization_id = :tenantId', { tenantId })
      .select(['user.id', 'user.name', 'user.email', 'membership.role'])
      .getMany();
  }
}
