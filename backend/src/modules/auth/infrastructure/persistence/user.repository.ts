import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../@common/infra/adapters/database/prisma/prisma.service';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const raw = await this.prisma.user.findUnique({ where: { email } });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const raw = await this.prisma.user.findUnique({ where: { id } });
    return raw ? UserMapper.toDomain(raw) : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    const data = UserMapper.toPersistence(user);
    const raw = await this.prisma.user.create({ data });
    return UserMapper.toDomain(raw);
  }
}
