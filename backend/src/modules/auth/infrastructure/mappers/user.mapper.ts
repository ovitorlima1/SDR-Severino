import { UserEntity } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(raw: any): UserEntity {
    return UserEntity.restore({
      id: raw.id,
      email: raw.email,
      passwordHash: raw.password_hash,
      name: raw.name,
      role: raw.role,
      createdAt: raw.created_at,
    });
  }

  static toPersistence(entity: UserEntity): any {
    return {
      id: entity.id,
      email: entity.email,
      password_hash: entity.passwordHash,
      name: entity.name,
      role: entity.role,
      created_at: entity.createdAt,
    };
  }
}
