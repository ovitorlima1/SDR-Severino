import { Module } from '@nestjs/common';
import { CampaignsController } from './presentation/controllers/campaigns.controller';
import { GetAllCampaignsUseCase } from './application/use-cases/get-all-campaigns/get-all-campaigns.use-case';
import { GetCampaignByIdUseCase } from './application/use-cases/get-campaign-by-id/get-campaign-by-id.use-case';
import { CreateCampaignUseCase } from './application/use-cases/create-campaign/create-campaign.use-case';
import { CampaignRepository } from './infrastructure/persistence/campaign.repository';
import { CAMPAIGN_REPOSITORY } from './domain/repositories/campaign.repository.interface';

@Module({
  controllers: [CampaignsController],
  providers: [
    GetAllCampaignsUseCase,
    GetCampaignByIdUseCase,
    CreateCampaignUseCase,
    { provide: CAMPAIGN_REPOSITORY, useClass: CampaignRepository },
  ],
})
export class CampaignsModule {}
