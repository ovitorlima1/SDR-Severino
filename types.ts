
export interface Client {
  id: string;
  
  // Mapeamento direto da Tabela Energia
  cnpj?: string;
  name: string; // Mapeado de 'nome'
  municipio?: string;
  endereco?: string;
  clienteLivre?: string;
  microGerador?: string;
  nivelTensao?: string;
  classePrincipal?: string;
  subclasse?: string;
  potencia?: string;
  tipoTarifa?: string; // Mapeado de 'tipo_tarifa'
  tipoCliente?: string;
  dataDe?: string;
  dataAte?: string;
  contratoAtivo?: string;
  telFixo?: string;
  telMovel?: string;
  email: string;
  
  // Campos de Sistema/IA
  company: string; // Alias para 'nome' na visualização
  role: string; // Fixo 'Decisor' ou derivado
  industry: string; // Alias para 'classePrincipal'
  employees: number; // Placeholder
  lastContact?: string;
  
  // Inteligência Severino
  segment: string; // Alias para 'tipo_perfil' para compatibilidade visual
  category: 'Indústria' | 'Serviços' | 'Comércio' | 'Não Definido'; // Derivado do CNAE
  state: string; // Derivado de municipio ou busca
  cnae?: string;
  profile?: string; // Mapeado de 'tipo_perfil'
  aiRationale?: string;
  tariffType?: string; // Alias para compatibilidade visual
}

export interface SegmentAnalysis {
  clientId: string;
  foundCompany?: string;
  foundCnpj?: string;
  segmentName: string;
  category: 'Indústria' | 'Serviços' | 'Comércio';
  state: string;
  cnae: string;
  profile: string;
  description: string;
}

export interface MessageTemplate {
  subject: string;
  emailBody: string;
  whatsappBody: string;
  linkedinBody: string;
  segmentName: string;
}

export interface Campaign {
  id: string;
  name: string;
  segmentProfile: string;
  segmentRegion: string;
  segmentCategory: string;
  totalLeads: number;
  subject: string;
  body: string; // Mantido para compatibilidade, mas pode concatenar as 3 versões
  emailBody?: string;
  whatsappBody?: string;
  linkedinBody?: string;
  status: 'Enviada' | 'Agendada' | 'Processando';
  createdAt: string;
}

export interface BilliAnalysis {
  identification: {
    razaoSocial: string;
    cnpj: string;
    cnae: string;
    localizacao: string;
    ecossistema: string;
  };
  eixos: {
    eixo1: { sinais: string[]; veredito: string };
    eixo2: { sinais: string[]; veredito: string };
  };
  scoring: {
    maturity: { evidence: string; points: number };
    energy: { evidence: string; points: number };
    capital: { evidence: string; points: number };
    language: { evidence: string; points: number };
    total: number;
  };
  profile: {
    code: string;
    name: string;
    reason: string;
    pain: string;
    opportunity: string;
  };
  nextSteps: {
    donts: string[];
    do: {
      narrative: string;
      trigger: string;
    };
  };
  sources?: { title: string; uri: string }[];
}

export interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  friendlyName: string;
  status: 'disponivel' | 'ativando' | 'ativo' | 'cancelado';
  verificationCode?: string;
  createdAt: string;
}

export type ViewState = 'dashboard' | 'clients' | 'campaigns' | 'qualifier' | 'history' | 'whatsapp';
