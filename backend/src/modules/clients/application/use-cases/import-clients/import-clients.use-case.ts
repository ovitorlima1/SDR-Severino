import { Injectable, Inject } from '@nestjs/common';
import { IClientRepository, CLIENT_REPOSITORY } from '../../../domain/repositories/client.repository.interface';
import { ClientEntity } from '../../../domain/entities/client.entity';
import { CreateClientDto } from '../../validators/client.validator';
import { PrismaService } from '../../../../@common/infra/adapters/database/prisma/prisma.service';

@Injectable()
export class ImportClientsUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private clientRepository: IClientRepository,
    private prisma: PrismaService,
  ) {}

  async execute(clients: CreateClientDto[], batchName: string): Promise<{ imported: number }> {
    const entities = clients.map((dto) =>
      ClientEntity.create({
        nome: dto.nome,
        cnpj: dto.cnpj,
        municipio: dto.municipio,
        estado: dto.estado,
        endereco: dto.endereco,
        clienteLivre: dto.clienteLivre,
        microGerador: dto.microGerador,
        nivelTensao: dto.nivelTensao,
        classePrincipal: dto.classePrincipal,
        subclasse: dto.subclasse,
        potencia: dto.potencia,
        tipoTarifa: dto.tipoTarifa,
        tipoCliente: dto.tipoCliente,
        dataDe: dto.dataDe,
        dataAte: dto.dataAte,
        contratoAtivo: dto.contratoAtivo,
        telFixo: dto.telFixo,
        telMovel: dto.telMovel,
        email: dto.email,
        cnae: dto.cnae,
        tipoPerfil: dto.tipoPerfil,
        sourceBatch: batchName,
        lat: dto.lat,
        lng: dto.lng,
      }),
    );

    await this.clientRepository.upsertMany(entities);

    await this.prisma.importHistory.create({
      data: {
        filename: batchName,
        total_rows: clients.length,
        new_leads: clients.length,
        updated_leads: 0,
      },
    });

    return { imported: clients.length };
  }
}
