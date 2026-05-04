import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { NotificationService } from '../../common/services/notification.service';
import { v4 as uuidv4 } from 'uuid';
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

  async getAllUsers(): Promise<UserOutputDto[]> {
    const users = await this.userRepo.findAll();
    return users.map(user => ({
      id: user.user_id,
      name: user.username || '',
      email: user.email || '',
      role: user.role
    }));
  }

  async createUser(dto: any): Promise<UserOutputDto> {
    const newUser = await this.userRepo.create({
      user_id: uuidv4(),
      username: dto.username,
      email: dto.email,
      phone: dto.phone,
      role: dto.role || 'student',
      created_at: new Date().toISOString()
    });
    return {
      id: newUser.user_id,
      name: newUser.username || '',
      email: newUser.email || '',
      role: newUser.role
    };
  }

  async updateUser(userId: string, dto: any): Promise<UserOutputDto> {
    const user = await this.userRepo.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'admin' && dto.role && dto.role !== 'admin') {
      throw new ForbiddenException('Cannot downgrade an admin');
    }

    const updated = await this.userRepo.update(userId, dto);
    if (!updated) throw new NotFoundException('User not found');

    return {
      id: updated.user_id,
      name: updated.username || '',
      email: updated.email || '',
      role: updated.role
    };
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepo.findOneById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin') throw new ForbiddenException('Cannot delete an admin');
    
    await this.userRepo.delete(userId);
  }
}
