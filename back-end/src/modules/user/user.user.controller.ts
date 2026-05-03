import { Controller, Patch, Get, Body, Param, UseGuards, SetMetadata, Post, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { UserService } from './user.user.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { UpdateRoleInputDto } from './dto/update-role.input.dto';
import { UpdateUserInputDto } from './dto/update-user.input.dto';
import { UserOutputDto } from './dto/user.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { MOCK_USERS, MOCK_STUDENTS, MOCK_FACULTY } from '../../common/types/mock-data';

@ApiTags('User')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch(':id/role')
  @SetMetadata('roles', ['academic_head'])
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateRoleInputDto })
  @ApiResponse({ status: 200, type: UserOutputDto })
  async updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleInputDto) {
    const data = await this.userService.updateUserRole(id, dto);
    return new BaseResponseDto(true, data, 'role update successful');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      users: MOCK_USERS,
      students: MOCK_STUDENTS,
      faculty: MOCK_FACULTY
    }, 'mock data fetched');
  }

  @Get(':id')
  @SetMetadata('roles', ['admin', 'academic_head', 'faculty'])
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, type: UserOutputDto })
  async getUserById(@Param('id') id: string) {
    const data = await this.userService.getUserById(id);
    return new BaseResponseDto(true, data, 'user fetch successful');
  }

  @Get()
  @SetMetadata('roles', ['admin', 'academic_head', 'faculty'])
  @ApiResponse({ status: 200, type: [UserOutputDto] })
  async getAllUsers() {
    const data = await this.userService.getAllUsers();
    return new BaseResponseDto(true, data, 'users fetched successfully');
  }

  @Post()
  @SetMetadata('roles', ['admin'])
  @ApiBody({ type: UpdateUserInputDto })
  @ApiResponse({ status: 201, type: UserOutputDto })
  async createUser(@Body() dto: UpdateUserInputDto) {
    const data = await this.userService.createUser(dto);
    return new BaseResponseDto(true, data, 'user created successfully');
  }

  @Put(':id')
  @SetMetadata('roles', ['admin', 'academic_head'])
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserInputDto })
  @ApiResponse({ status: 200, type: UserOutputDto })
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserInputDto) {
    const data = await this.userService.updateUser(id, dto);
    return new BaseResponseDto(true, data, 'user updated successfully');
  }

  @Delete(':id')
  @SetMetadata('roles', ['admin'])
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(@Param('id') id: string) {
    await this.userService.deleteUser(id);
    return new BaseResponseDto(true, null, 'user deleted successfully');
  }
}
