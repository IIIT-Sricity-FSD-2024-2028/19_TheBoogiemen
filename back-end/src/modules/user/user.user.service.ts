import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRepository } from './user.user.repository';
import { UpdateRoleInputDto } from './dto/update-role.input.dto';
import { UserOutputDto } from './dto/user.output.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async updateUserRole(userId: string, dto: UpdateRoleInputDto): Promise<UserOutputDto> {
    const user = await this.userRepo.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'admin' && dto.role !== 'admin') {
      throw new ForbiddenException('Cannot downgrade an admin');
    }

    const updated = await this.userRepo.update(userId, { role: dto.role });
    if (!updated) throw new NotFoundException('User not found');

    return {
      id: updated.user_id,
      name: updated.username || '',
      email: updated.email || '',
      role: updated.role
    };
  }

  async getUserById(userId: string): Promise<UserOutputDto> {
    const user = await this.userRepo.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.user_id,
      name: user.username || '',
      email: user.email || '',
      role: user.role
    };
  }
}
