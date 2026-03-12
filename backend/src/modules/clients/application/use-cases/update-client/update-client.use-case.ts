import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IClientRepository, CLIENT_REPOSITORY } from '../../../domain/repositories/client.repository.interface';
import { ClientEntity } from '../../../domain/entities/client.entity';
import { ClientMapper } from '../../../infrastructure/mappers/client.mapper';
import { UpdateClientDto } from '../../validators/client.validator';

@Injectable()
export class UpdateClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY)
    private clientRepository: IClientRepository,
  ) {}

  async execute(id: string, dto: UpdateClientDto): Promise<any> {
    const existing = await this.clientRepository.findById(id);
    if (!existing) throw new NotFoundException('Cliente não encontrado');

    const updated = await this.clientRepository.update(
      ClientEntity.restore({
        id: existing.id,
        cnpj: dto.cnpj ?? existing.cnpj,
        nome: dto.nome ?? existing.nome,
        municipio: dto.municipio ?? existing.municipio,
        estado: dto.estado ?? existing.estado,
        endereco: dto.endereco ?? existing.endereco,
        clienteLivre: dto.clienteLivre ?? existing.clienteLivre,
        microGerador: dto.microGerador ?? existing.microGerador,
        nivelTensao: dto.nivelTensao ?? existing.nivelTensao,
        classePrincipal: dto.classePrincipal ?? existing.classePrincipal,
        subclasse: dto.subclasse ?? existing.subclasse,
        potencia: dto.potencia ?? existing.potencia,
        tipoTarifa: dto.tipoTarifa ?? existing.tipoTarifa,
        tipoCliente: dto.tipoCliente ?? existing.tipoCliente,
        dataDe: dto.dataDe ?? existing.dataDe,
        dataAte: dto.dataAte ?? existing.dataAte,
        contratoAtivo: dto.contratoAtivo ?? existing.contratoAtivo,
        telFixo: dto.telFixo ?? existing.telFixo,
        telMovel: dto.telMovel ?? existing.telMovel,
        email: dto.email ?? existing.email,
        cnae: dto.cnae ?? existing.cnae,
        tipoPerfil: dto.tipoPerfil ?? existing.tipoPerfil,
        aiRationale: existing.aiRationale,
        sourceBatch: dto.sourceBatch ?? existing.sourceBatch,
        isDeleted: existing.isDeleted,
        lat: dto.lat ?? existing.lat,
        lng: dto.lng ?? existing.lng,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      }),
    );
    return ClientMapper.toResponse(updated);
  }
}
