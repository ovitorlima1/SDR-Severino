import { Module } from '@nestjs/common';
import { ClientsController } from './presentation/controllers/clients.controller';
import { GetAllClientsUseCase } from './application/use-cases/get-all-clients/get-all-clients.use-case';
import { CreateClientUseCase } from './application/use-cases/create-client/create-client.use-case';
import { UpdateClientUseCase } from './application/use-cases/update-client/update-client.use-case';
import { DeleteClientUseCase } from './application/use-cases/delete-client/delete-client.use-case';
import { ImportClientsUseCase } from './application/use-cases/import-clients/import-clients.use-case';
import { ClientRepository } from './infrastructure/persistence/client.repository';
import { CLIENT_REPOSITORY } from './domain/repositories/client.repository.interface';

@Module({
  controllers: [ClientsController],
  providers: [
    GetAllClientsUseCase,
    CreateClientUseCase,
    UpdateClientUseCase,
    DeleteClientUseCase,
    ImportClientsUseCase,
    { provide: CLIENT_REPOSITORY, useClass: ClientRepository },
  ],
})
export class ClientsModule {}
