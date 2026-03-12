import { Injectable, Inject } from '@nestjs/common';
import { ICampaignRepository, CAMPAIGN_REPOSITORY } from '../../../domain/repositories/campaign.repository.interface';
import { CampaignEntity } from '../../../domain/entities/campaign.entity';
import { CampaignMapper } from '../../../infrastructure/mappers/campaign.mapper';
import { CreateCampaignDto } from '../../validators/campaign.validator';

@Injectable()
export class CreateCampaignUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY)
    private campaignRepository: ICampaignRepository,
  ) {}

  async execute(dto: CreateCampaignDto): Promise<any> {
    const campaign = CampaignEntity.create({
      name: dto.name,
      segmentProfile: dto.segmentProfile,
      segmentRegion: dto.segmentRegion,
      segmentCategory: dto.segmentCategory,
      totalLeads: dto.totalLeads ?? 0,
      emailSubject: dto.emailSubject,
      emailBody: dto.emailBody,
      whatsappBody: dto.whatsappBody,
      linkedinBody: dto.linkedinBody,
      status: dto.status ?? 'Agendada',
    });

    const saved = await this.campaignRepository.create(campaign, dto.leadIds);
    return CampaignMapper.toResponse(saved);
  }
}
