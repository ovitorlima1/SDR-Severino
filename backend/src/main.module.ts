import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MainController } from './main.controller';
import { DatabaseModule } from './modules/@common/infra/adapters/database/prisma/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { KommoModule } from './modules/kommo/kommo.module';
import { validateEnv } from './_core/@shared/infra/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    AuthModule,
    ClientsModule,
    CampaignsModule,
    KommoModule,
  ],
  controllers: [MainController],
})
export class MainModule {}
