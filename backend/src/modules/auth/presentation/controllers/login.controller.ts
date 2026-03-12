import { Body, Controller, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginUseCase } from '../../application/use-cases/login/login.use-case';
import { loginSchema, LoginDto } from '../../application/validators/login.validator';
import { ZodValidationPipe } from '../../../@common/application/pipes/zod-validation.pipe';
import { CoreApiResponse } from '../../../../_core/@shared/domain/api/CoreApiResponse';

@ApiTags('Auth')
@Controller('auth')
export class LoginController {
  constructor(private loginUseCase: LoginUseCase) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar usuário e obter JWT' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto) {
    const result = await this.loginUseCase.execute(dto);
    return CoreApiResponse.success(result, 'Login realizado com sucesso');
  }
}
