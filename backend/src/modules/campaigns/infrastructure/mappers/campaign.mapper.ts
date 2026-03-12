import { CampaignEntity } from '../../domain/entities/campaign.entity';

export class CampaignMapper {
  static toDomain(raw: any): CampaignEntity {
    return CampaignEntity.restore({
      id: raw.id,
      name: raw.name,
      segmentProfile: raw.segment_profile,
      segmentRegion: raw.segment_region,
      segmentCategory: raw.segment_category,
      totalLeads: raw.total_leads,
      emailSubject: raw.email_subject,
      emailBody: raw.email_body,
      whatsappBody: raw.whatsapp_body,
      linkedinBody: raw.linkedin_body,
      status: raw.status,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    });
  }

  static toPersistence(entity: CampaignEntity): any {
    return {
      id: entity.id,
      name: entity.name,
      segment_profile: entity.segmentProfile ?? null,
      segment_region: entity.segmentRegion ?? null,
      segment_category: entity.segmentCategory ?? null,
      total_leads: entity.totalLeads,
      email_subject: entity.emailSubject ?? null,
      email_body: entity.emailBody ?? null,
      whatsapp_body: entity.whatsappBody ?? null,
      linkedin_body: entity.linkedinBody ?? null,
      status: entity.status,
    };
  }

  static toResponse(entity: CampaignEntity): any {
    return {
      id: entity.id,
      name: entity.name,
      segmentProfile: entity.segmentProfile,
      segmentRegion: entity.segmentRegion,
      segmentCategory: entity.segmentCategory,
      totalLeads: entity.totalLeads,
      subject: entity.emailSubject,
      body: entity.emailBody,
      emailBody: entity.emailBody,
      whatsappBody: entity.whatsappBody,
      linkedinBody: entity.linkedinBody,
      status: entity.status as any,
      createdAt: entity.createdAt,
    };
  }
}
