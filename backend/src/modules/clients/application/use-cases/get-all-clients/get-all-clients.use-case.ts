import { Injectable, Inject } from '@nestjs/common';
import { IClientRepository, CLIENT_REPOSITORY, ClientFilters } from '../../../domain/repositories/client.repository.interface';
import { ClientMapper } from '../../../infrastructure/mappers/client.mapper';

@Injectable()
export class GetAllClientsUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private clientRepository: IClientRepository,
  ) {}

  async execute(filters?: ClientFilters): Promise<any[]> {
    const clients = await this.clientRepository.findAll(filters);
    return clients.map(ClientMapper.toResponse);
  }
}
