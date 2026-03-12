import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICampaignRepository, CAMPAIGN_REPOSITORY } from '../../../domain/repositories/campaign.repository.interface';
import { CampaignMapper } from '../../../infrastructure/mappers/campaign.mapper';

@Injectable()
export class GetCampaignByIdUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY)
    private campaignRepository: ICampaignRepository,
  ) {}

  async execute(id: string): Promise<any> {
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) throw new NotFoundException('Campanha não encontrada');
    return CampaignMapper.toResponse(campaign);
  }
}
