import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../@common/infra/adapters/database/prisma/prisma.service';
import { ICampaignRepository } from '../../domain/repositories/campaign.repository.interface';
import { CampaignEntity } from '../../domain/entities/campaign.entity';
import { CampaignMapper } from '../mappers/campaign.mapper';

@Injectable()
export class CampaignRepository implements ICampaignRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<CampaignEntity[]> {
    const raws = await this.prisma.campaign.findMany({ orderBy: { created_at: 'desc' } });
    return raws.map(CampaignMapper.toDomain);
  }

  async findById(id: string): Promise<CampaignEntity | null> {
    const raw = await this.prisma.campaign.findUnique({ where: { id } });
    return raw ? CampaignMapper.toDomain(raw) : null;
  }

  async findLatest(): Promise<CampaignEntity | null> {
    const raw = await this.prisma.campaign.findFirst({ orderBy: { created_at: 'desc' } });
    return raw ? CampaignMapper.toDomain(raw) : null;
  }

  async create(campaign: CampaignEntity, leadIds?: string[]): Promise<CampaignEntity> {
    const data = CampaignMapper.toPersistence(campaign);
    const raw = await this.prisma.campaign.create({ data });

    if (leadIds && leadIds.length > 0) {
      await this.prisma.campaignLead.createMany({
        data: leadIds.map((clientId) => ({
          campaign_id: raw.id,
          client_id: clientId,
          status: 'pendente',
        })),
        skipDuplicates: true,
      });
    }

    return CampaignMapper.toDomain(raw);
  }

  async count(): Promise<number> {
    return this.prisma.campaign.count();
  }
}
