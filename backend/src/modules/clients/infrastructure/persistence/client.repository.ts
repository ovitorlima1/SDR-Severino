import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../@common/infra/adapters/database/prisma/prisma.service';
import { IClientRepository, ClientFilters } from '../../domain/repositories/client.repository.interface';
import { ClientEntity } from '../../domain/entities/client.entity';
import { ClientMapper } from '../mappers/client.mapper';

@Injectable()
export class ClientRepository implements IClientRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: ClientFilters): Promise<ClientEntity[]> {
    const where: any = { is_deleted: filters?.isDeleted ?? false };

    if (filters?.profile) where.tipo_perfil = filters.profile;
    if (filters?.state && filters.state !== 'all') where.estado = filters.state;
    if (filters?.category && filters.category !== 'all') where.classe_principal = filters.category;
    if (filters?.potencia && filters.potencia !== '0') {
      const numValue = parseInt(filters.potencia);
      if (!isNaN(numValue) && numValue > 0) {
        where.potencia = { gte: filters.potencia };
      } else {
        where.potencia = { contains: filters.potencia, mode: 'insensitive' };
      }
    }

    const raws = await this.prisma.client.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100000,
    });

    return raws.map(ClientMapper.toDomain);
  }

  async findById(id: string): Promise<ClientEntity | null> {
    const raw = await this.prisma.client.findUnique({ where: { id } });
    return raw ? ClientMapper.toDomain(raw) : null;
  }

  async findByCnpj(cnpj: string): Promise<ClientEntity | null> {
    const raw = await this.prisma.client.findUnique({ where: { cnpj } });
    return raw ? ClientMapper.toDomain(raw) : null;
  }

  async create(client: ClientEntity): Promise<ClientEntity> {
    const data = ClientMapper.toPersistence(client);
    const raw = await this.prisma.client.create({ data });
    return ClientMapper.toDomain(raw);
  }

  async update(client: ClientEntity): Promise<ClientEntity> {
    const data = ClientMapper.toPersistence(client);
    const raw = await this.prisma.client.update({ where: { id: client.id }, data });
    return ClientMapper.toDomain(raw);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.delete({ where: { id } });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.client.update({ where: { id }, data: { is_deleted: true } });
  }

  async softDeleteByBatch(batchName: string): Promise<void> {
    const clients = await this.prisma.client.findMany({
      where: { source_batch: batchName },
      select: { id: true, nome: true, source_batch: true },
    });

    if (clients.length > 0) {
      await this.prisma.deletionLog.createMany({
        data: clients.map((c) => ({
          client_id: c.id,
          client_name: c.nome,
          source_batch: c.source_batch,
        })),
      });
    }

    await this.prisma.client.updateMany({
      where: { source_batch: batchName },
      data: { is_deleted: true },
    });
  }

  async upsertMany(clients: ClientEntity[]): Promise<void> {
    for (const client of clients) {
      const data = ClientMapper.toPersistence(client);
      await this.prisma.client.upsert({
        where: { cnpj: client.cnpj ?? '' },
        create: data,
        update: {
          nome: data.nome,
          municipio: data.municipio,
          estado: data.estado,
          potencia: data.potencia,
          tipo_tarifa: data.tipo_tarifa,
          classe_principal: data.classe_principal,
          source_batch: data.source_batch,
        },
      });
    }
  }

  async count(filters?: ClientFilters): Promise<number> {
    const where: any = { is_deleted: filters?.isDeleted ?? false };
    if (filters?.profile) where.tipo_perfil = filters.profile;
    if (filters?.state && filters.state !== 'all') where.estado = filters.state;
    if (filters?.category && filters.category !== 'all') where.classe_principal = filters.category;

    return this.prisma.client.count({ where });
  }

  async findPending(limit: number): Promise<ClientEntity[]> {
    const raws = await this.prisma.client.findMany({
      where: {
        OR: [
          { tipo_perfil: null },
          { tipo_perfil: '' },
          { tipo_perfil: 'Não Segmentado' },
        ],
      },
      take: limit,
    });
    return raws.map(ClientMapper.toDomain);
  }

  async findDistinctPotencias(): Promise<string[]> {
    const raws = await this.prisma.client.findMany({
      where: { potencia: { not: null } },
      select: { potencia: true },
      distinct: ['potencia'],
    });
    return raws
      .map((r) => r.potencia)
      .filter(Boolean)
      .sort() as string[];
  }
}
