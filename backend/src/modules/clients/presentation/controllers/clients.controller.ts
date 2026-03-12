import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { GetAllClientsUseCase } from '../../application/use-cases/get-all-clients/get-all-clients.use-case';
import { CreateClientUseCase } from '../../application/use-cases/create-client/create-client.use-case';
import { UpdateClientUseCase } from '../../application/use-cases/update-client/update-client.use-case';
import { DeleteClientUseCase } from '../../application/use-cases/delete-client/delete-client.use-case';
import { ImportClientsUseCase } from '../../application/use-cases/import-clients/import-clients.use-case';
import { ZodValidationPipe } from '../../../@common/application/pipes/zod-validation.pipe';
import {
  createClientSchema,
  updateClientSchema,
  CreateClientDto,
  UpdateClientDto,
} from '../../application/validators/client.validator';
import { CoreApiResponse } from '../../../../_core/@shared/domain/api/CoreApiResponse';

@ApiTags('Clients')
@Controller('clients')
export class ClientsController {
  constructor(
    private getAllClientsUseCase: GetAllClientsUseCase,
    private createClientUseCase: CreateClientUseCase,
    private updateClientUseCase: UpdateClientUseCase,
    private deleteClientUseCase: DeleteClientUseCase,
    private importClientsUseCase: ImportClientsUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os clientes/leads' })
  @ApiQuery({ name: 'profile', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'potencia', required: false })
  async getAll(
    @Query('profile') profile?: string,
    @Query('state') state?: string,
    @Query('category') category?: string,
    @Query('potencia') potencia?: string,
  ) {
    const result = await this.getAllClientsUseCase.execute({ profile, state, category, potencia });
    return CoreApiResponse.success(result);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado' })
  async create(@Body(new ZodValidationPipe(createClientSchema)) dto: CreateClientDto) {
    const result = await this.createClientUseCase.execute(dto);
    return CoreApiResponse.created(result);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cliente' })
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateClientSchema)) dto: UpdateClientDto,
  ) {
    const result = await this.updateClientUseCase.execute(id, dto);
    return CoreApiResponse.success(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete de cliente' })
  async delete(@Param('id') id: string) {
    await this.deleteClientUseCase.execute(id);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar lote de clientes' })
  async import(
    @Body() body: { clients: CreateClientDto[]; batchName: string },
  ) {
    const result = await this.importClientsUseCase.execute(body.clients, body.batchName);
    return CoreApiResponse.created(result, `${result.imported} clientes importados`);
  }
}
