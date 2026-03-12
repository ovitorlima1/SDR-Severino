import { CampaignEntity } from '../entities/campaign.entity';

export const CAMPAIGN_REPOSITORY = 'CAMPAIGN_REPOSITORY';

export interface ICampaignRepository {
  findAll(): Promise<CampaignEntity[]>;
  findById(id: string): Promise<CampaignEntity | null>;
  findLatest(): Promise<CampaignEntity | null>;
  create(campaign: CampaignEntity, leadIds?: string[]): Promise<CampaignEntity>;
  count(): Promise<number>;
}
