import { v4 as uuidv4 } from 'uuid';

export interface CampaignProps {
  id: string;
  name: string;
  segmentProfile?: string;
  segmentRegion?: string;
  segmentCategory?: string;
  totalLeads: number;
  emailSubject?: string;
  emailBody?: string;
  whatsappBody?: string;
  linkedinBody?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CampaignEntity {
  private readonly props: CampaignProps;

  private constructor(props: CampaignProps) {
    this.props = props;
  }

  static create(props: Omit<CampaignProps, 'id' | 'createdAt' | 'updatedAt'>): CampaignEntity {
    const now = new Date();
    return new CampaignEntity({ ...props, id: uuidv4(), createdAt: now, updatedAt: now });
  }

  static restore(props: CampaignProps): CampaignEntity {
    return new CampaignEntity(props);
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get segmentProfile(): string | undefined { return this.props.segmentProfile; }
  get segmentRegion(): string | undefined { return this.props.segmentRegion; }
  get segmentCategory(): string | undefined { return this.props.segmentCategory; }
  get totalLeads(): number { return this.props.totalLeads; }
  get emailSubject(): string | undefined { return this.props.emailSubject; }
  get emailBody(): string | undefined { return this.props.emailBody; }
  get whatsappBody(): string | undefined { return this.props.whatsappBody; }
  get linkedinBody(): string | undefined { return this.props.linkedinBody; }
  get status(): string { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}
