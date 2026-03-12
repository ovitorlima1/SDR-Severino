import { Injectable, Inject } from '@nestjs/common';
import { ICampaignRepository, CAMPAIGN_REPOSITORY } from '../../../domain/repositories/campaign.repository.interface';
import { CampaignMapper } from '../../../infrastructure/mappers/campaign.mapper';

@Injectable()
export class GetAllCampaignsUseCase {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY)
    private campaignRepository: ICampaignRepository,
  ) {}

  async execute(): Promise<any[]> {
    const campaigns = await this.campaignRepository.findAll();
    return campaigns.map(CampaignMapper.toResponse);
  }
}
