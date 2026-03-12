import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetAllCampaignsUseCase } from '../../application/use-cases/get-all-campaigns/get-all-campaigns.use-case';
import { GetCampaignByIdUseCase } from '../../application/use-cases/get-campaign-by-id/get-campaign-by-id.use-case';
import { CreateCampaignUseCase } from '../../application/use-cases/create-campaign/create-campaign.use-case';
import { ZodValidationPipe } from '../../../@common/application/pipes/zod-validation.pipe';
import { createCampaignSchema, CreateCampaignDto } from '../../application/validators/campaign.validator';
import { CoreApiResponse } from '../../../../_core/@shared/domain/api/CoreApiResponse';

@ApiTags('Campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private getAllCampaignsUseCase: GetAllCampaignsUseCase,
    private getCampaignByIdUseCase: GetCampaignByIdUseCase,
    private createCampaignUseCase: CreateCampaignUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as campanhas' })
  async getAll() {
    const result = await this.getAllCampaignsUseCase.execute();
    return CoreApiResponse.success(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar campanha por ID' })
  async getById(@Param('id') id: string) {
    const result = await this.getCampaignByIdUseCase.execute(id);
    return CoreApiResponse.success(result);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova campanha' })
  async create(@Body(new ZodValidationPipe(createCampaignSchema)) dto: CreateCampaignDto) {
    const result = await this.createCampaignUseCase.execute(dto);
    return CoreApiResponse.created(result);
  }
}
