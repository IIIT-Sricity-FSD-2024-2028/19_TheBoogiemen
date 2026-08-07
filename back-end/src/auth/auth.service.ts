import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../core/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private db: InMemoryDbService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // Backward compatibility with in-memory DB during Phase 1 transition
    const student = this.db.students.find((s) => s.email === email);
    const faculty = this.db.faculty.find((f) => f.email === email);
    const profile = student || faculty;
    
    const inMemUser = this.db.users.find(u => u.email === email);

    // Return a mock token and user object
    return {
      token: 'mock-jwt-token',
      user: {
        user_id: user.id, // Using the new UUID
        username: user.name,
        email: user.email,
        role: inMemUser?.role || 'student',
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        organization_id: 'default-tenant-1',
      },
    };
  }

  async signup(body: any) {
    const existingUser = await this.userRepository.findOne({ where: { email: body.email } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const username = body.username || `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.email.split('@')[0];

    const newUser = this.userRepository.create({
      email: body.email,
      name: username,
      passwordHash: passwordHash,
      platformRole: 'user'
    });
    const savedUser = await this.userRepository.save(newUser);
    const id = savedUser.id;

    // Backward compat - in-memory DB
    const inMemUser = {
        user_id: id,
        username,
        first_name: body.first_name || username.split(' ')[0] || 'User',
        last_name:  body.last_name  || username.split(' ').slice(1).join(' ') || '',
        password: body.password, 
        email: body.email,
        role: body.role
    };
    this.db.users.push(inMemUser);

    if (inMemUser.role === 'student') {
        this.db.students.push({
          user_id: id,
          first_name: inMemUser.first_name,
          last_name:  inMemUser.last_name,
          branch:     body.branch    || 'CSE',
          batch:      body.batch     || '2024-2028',
          cgpa:       7.0,
          section:    body.section   || 'A',
          email:      body.email,
          join_date:  new Date().toISOString().split('T')[0],
          dob:        '2005-01-01',
          phone:      ''
        });
        this.db.enrollment.push({
          enrollment_id: `e${this.db.enrollment.length + 1}`,
          student_id: id,
          course_id:  'c1',
          year_id:    'y1',
          status:     'active',
          section:    body.section || 'A'
        });
    } else if (inMemUser.role === 'faculty') {
        const deptMap: Record<string, string> = { ECE: 'dept2', CSE: 'dept1', MATH: 'dept1', PHY: 'dept1' };
        this.db.faculty.push({
          user_id:       id,
          first_name:    inMemUser.first_name,
          last_name:     inMemUser.last_name,
          designation:   body.designation || 'Assistant Professor',
          department_id: (body.department && deptMap[body.department]) || 'dept1',
          email:         body.email,
          phone:         ''
        });
    }
    return { success: true, message: 'Registration successful. You can now login.', user_id: id };
  }

  async changePassword(userId: string, current: string, newPass: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const isMatch = await bcrypt.compare(current, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Current password incorrect');
    }
    user.passwordHash = await bcrypt.hash(newPass, 10);
    await this.userRepository.save(user);
    
    const inMemUser = this.db.users.find((u) => u.user_id === userId);
    if(inMemUser) {
        inMemUser.password = newPass;
    }
    return { success: true };
  }
}
