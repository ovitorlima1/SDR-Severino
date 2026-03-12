import { Injectable, Inject } from '@nestjs/common';
import { IClientRepository, CLIENT_REPOSITORY } from '../../../domain/repositories/client.repository.interface';
import { ClientEntity } from '../../../domain/entities/client.entity';
import { ClientMapper } from '../../../infrastructure/mappers/client.mapper';
import { CreateClientDto } from '../../validators/client.validator';

@Injectable()
export class CreateClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private clientRepository: IClientRepository,
  ) {}

  async execute(dto: CreateClientDto): Promise<any> {
    const client = ClientEntity.create({
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
      sourceBatch: dto.sourceBatch,
      lat: dto.lat,
      lng: dto.lng,
    });

    const saved = await this.clientRepository.create(client);
    return ClientMapper.toResponse(saved);
  }
}
