import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IClientRepository, CLIENT_REPOSITORY } from '../../../domain/repositories/client.repository.interface';

@Injectable()
export class DeleteClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private clientRepository: IClientRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.clientRepository.findById(id);
    if (!existing) throw new NotFoundException('Cliente não encontrado');
    await this.clientRepository.softDelete(id);
  }
}
