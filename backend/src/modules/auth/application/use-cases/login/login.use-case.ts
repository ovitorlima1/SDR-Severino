import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface';
import { BcryptHasher } from '../../../../@common/infra/adapters/cryptography/bcrypt-hasher';
import { JwtEncrypter } from '../../../../@common/infra/adapters/cryptography/jwt-encrypter';
import { LoginDto } from '../../validators/login.validator';

export interface LoginOutput {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private userRepository: IUserRepository,
    private bcryptHasher: BcryptHasher,
    private jwtEncrypter: JwtEncrypter,
  ) {}

  async execute(dto: LoginDto): Promise<LoginOutput> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await this.bcryptHasher.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const accessToken = await this.jwtEncrypter.encrypt({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
