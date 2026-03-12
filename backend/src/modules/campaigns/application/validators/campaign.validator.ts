import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  segmentProfile: z.string().optional(),
  segmentRegion: z.string().optional(),
  segmentCategory: z.string().optional(),
  totalLeads: z.number().default(0),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  whatsappBody: z.string().optional(),
  linkedinBody: z.string().optional(),
  status: z.enum(['Enviada', 'Agendada', 'Processando']).default('Agendada'),
  leadIds: z.array(z.string()).optional(),
});

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
