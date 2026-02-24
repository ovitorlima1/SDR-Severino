
import { Client, SegmentAnalysis, Campaign, WhatsAppNumber } from '../types';
import { supabase } from './supabase';

/**
 * Converte dados do Supabase (snake_case - Tabela Nova) para o formato do App (camelCase)
 */
const mapDBToClient = (dbData: any): Client => ({
  id: dbData.id,

  // Campos Principais da Tabela Energia
  cnpj: dbData.cnpj,
  name: dbData.nome || 'Sem Nome',
  company: dbData.nome || 'Sem Empresa',
  municipio: dbData.municipio,
  endereco: dbData.endereco,
  clienteLivre: dbData.cliente_livre,
  microGerador: dbData.micro_gerador,
  nivelTensao: dbData.nivel_tensao,
  classePrincipal: dbData.classe_principal,
  industry: dbData.classe_principal || 'Geral',
  subclasse: dbData.subclasse,
  potencia: dbData.potencia,
  tipoTarifa: dbData.tipo_tarifa,
  tariffType: dbData.tipo_tarifa,
  tipoCliente: dbData.tipo_cliente,
  dataDe: dbData.data_de,
  dataAte: dbData.data_ate,
  contratoAtivo: dbData.contrato_ativo,
  telFixo: dbData.tel_fixo,
  telMovel: dbData.tel_movel,
  email: dbData.email || '',

  // Inteligência
  cnae: dbData.cnae,
  profile: dbData.tipo_perfil,
  segment: dbData.tipo_perfil || 'Não Segmentado',
  aiRationale: dbData.ai_rationale,

  role: 'Decisor',
  employees: 0,
  category: deriveCategory(dbData.classe_principal, dbData.cnae),
  state: dbData.estado || extractState(dbData.municipio),
  lastContact: dbData.created_at
});

const extractState = (municipio?: string) => {
  if (!municipio) return '';
  const parts = municipio.split('-');
  return parts.length > 1 ? parts[parts.length - 1].trim() : '';
};

const deriveCategory = (classe?: string, cnae?: string): 'Indústria' | 'Serviços' | 'Comércio' | 'Não Definido' => {
  const textToAnalyze = `${classe || ''} ${cnae || ''}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (textToAnalyze.includes('industr') || textToAnalyze.includes('fabric') || textToAnalyze.includes('rural')) return 'Indústria';
  if (textToAnalyze.includes('comerc') || textToAnalyze.includes('varejo') || textToAnalyze.includes('loja')) return 'Comércio';
  if (textToAnalyze.trim() === '') return 'Não Definido';
  return 'Serviços';
};

/**
 * Função utilitária para normalizar strings de categorias e classes
 */
const normalizeLabel = (label: string): string => {
  if (!label) return 'Não Definido';

  // Remove espaços extras nas pontas e normaliza para Capital Case
  let clean = label.trim();

  // Mapeamentos comuns para evitar duplicatas por causa de acentos ou variações
  const lower = clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (lower === 'industrial' || lower === 'industria') return 'Industrial';
  if (lower === 'comercial' || lower === 'comercio') return 'Comercial';
  if (lower === 'rural') return 'Rural';
  if (lower === 'poder publico' || lower === 'servico publico') return 'Poder Público';
  if (lower === 'iluminacao publica') return 'Iluminação Pública';
  if (lower === 'residencial') return 'Residencial';

  // Se não for um dos principais, apenas garante o Casing correto (Primeira letra Maiúscula)
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
};

export interface CampaignFilters {
  profile?: string;
  state?: string;
  category?: string;
  potencia?: string;
}

export const fetchPendingClients = async (limit: number): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .or('tipo_perfil.is.null,tipo_perfil.eq.,tipo_perfil.eq.Não Segmentado')
    .limit(limit);

  if (error) return [];
  return (data || []).map(mapDBToClient);
};

export const fetchClientsFromDB = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100000);

  if (error) return [];
  return (data || []).map(mapDBToClient);
};

export const fetchTotalClientsCount = async (): Promise<number> => {
  const { count, error } = await supabase.from('clients').select('*', { count: 'exact', head: true });
  return error ? 0 : (count || 0);
};

export const fetchTotalPendingCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .or('tipo_perfil.is.null,tipo_perfil.eq.,tipo_perfil.eq.Não Segmentado');
  return error ? 0 : (count || 0);
};

/**
 * BUSCA DE TARIFAS - EXIBE VALORES REAIS DO SUPABASE
 */
export const fetchTariffDistribution = async (): Promise<{ name: string, value: number }[]> => {
  const { data, error } = await supabase.rpc('get_tariff_distribution');
  return error ? [] : data;
};

/**
 * BUSCA DE PERFIS - NORMALIZADA PARA EVITAR DUPLICATAS VISUAIS
 */
export const fetchProfileDistribution = async (): Promise<{ name: string, value: number }[]> => {
  const { data, error } = await supabase.rpc('get_profile_distribution');
  if (error || !data) return [];

  const normalizedMap: Record<string, number> = {};

  data.forEach((item: { name: string, value: number }) => {
    let name = (item.name || 'Não Segmentado').trim();

    // Normalização de Casing (Ex: "Gestor" == "GESTOR")
    const lower = name.toLowerCase();

    // Mapeamento para os padrões do sistema
    if (lower === 'gestor') name = 'Gestor';
    else if (lower === 'pagador') name = 'Pagador';
    else if (lower === 'oportunista') name = 'Oportunista';
    else if (lower.includes('arquiteto')) name = 'Arquiteto Financeiro';
    else if (lower.includes('nao segmentado') || lower.includes('não segmentado')) name = 'Não Segmentado';

    // Soma os valores se a chave já existir
    normalizedMap[name] = (normalizedMap[name] || 0) + item.value;
  });

  return Object.entries(normalizedMap).map(([name, value]) => ({ name, value }));
};

/**
 * BUSCA DE SETORES - AGORA NORMALIZADA PARA EVITAR DUPLICATAS COMO "INDUSTRIAL" E "INDUSTRIAL "
 */
export const fetchSectorDistribution = async (): Promise<{ name: string, value: number }[]> => {
  const { data, error } = await supabase.rpc('get_sector_distribution');
  if (error || !data) return [];

  const normalizedMap: Record<string, number> = {};

  data.forEach((item: { name: string, value: number }) => {
    const normalizedName = normalizeLabel(item.name);
    normalizedMap[normalizedName] = (normalizedMap[normalizedName] || 0) + item.value;
  });

  return Object.entries(normalizedMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
};

/**
 * Busca todas as classes (setores) disponíveis para filtro de campanha
 */
export const fetchCampaignClasses = async (): Promise<string[]> => {
  const { data, error } = await supabase.rpc('get_sector_distribution');
  if (error || !data) return [];

  const distinctClasses = new Set<string>();
  data.forEach((d: any) => {
    distinctClasses.add(normalizeLabel(d.name));
  });

  return Array.from(distinctClasses).sort();
};

/**
 * Busca todas as potências disponíveis para filtro de campanha
 */
export const fetchCampaignPotencia = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('clients')
    .select('potencia')
    .not('potencia', 'is', null)
    .not('potencia', 'eq', '');

  if (error || !data) return [];

  const distinctPotencias = new Set<string>();
  data.forEach((d: any) => {
    if (d.potencia) distinctPotencias.add(d.potencia.trim());
  });

  return Array.from(distinctPotencias).sort();
};

const formatDateForDB = (inputValue: string | number | undefined): string | null => {
  if (!inputValue) return null;

  let date: Date | null = null;
  const strVal = String(inputValue).trim();

  // 1. Tenta detectar número (Serial Excel)
  if (/^\d+(\.\d+)?$/.test(strVal)) {
    const num = parseFloat(strVal);
    if (num > 30000 && num < 60000) {
      date = new Date((num - 25569) * 86400 * 1000);
    }
  }

  // 2. Se não resolveu, tenta formato PT-BR DD/MM/YYYY
  if (!date && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(strVal)) {
    const [day, month, year] = strVal.split('/').map(Number);
    date = new Date(year, month - 1, day);
  }

  // 3. Tenta construtor padrão (ISO, YYYY-MM-DD, etc)
  if (!date) {
    const d = new Date(strVal);
    if (!isNaN(d.getTime())) {
      date = d;
    }
  }

  // Validação final de sanidade
  if (!date || isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  if (year < 1950 || year > 2050) return null;

  try {
    return date.toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
};

export const saveClientsToDB = async (clients: Partial<Client>[]) => {
  const { data, error } = await supabase
    .from('clients')
    .upsert(clients.map(c => ({
      nome: c.name,
      cnpj: c.cnpj || null,
      municipio: c.municipio,
      estado: c.state,
      endereco: c.endereco,
      cliente_livre: c.clienteLivre,
      micro_gerador: c.microGerador,
      nivel_tensao: c.nivelTensao,
      classe_principal: c.classePrincipal,
      subclasse: c.subclasse,
      potencia: c.potencia,
      tipo_tarifa: c.tipoTarifa,
      tipo_cliente: c.tipoCliente,
      data_de: formatDateForDB(c.dataDe),
      data_ate: formatDateForDB(c.dataAte),
      contrato_ativo: c.contratoAtivo,
      tel_fixo: c.telFixo,
      tel_movel: c.telMovel,
      email: c.email,
      tipo_perfil: c.profile || 'Não Segmentado',
      cnae: c.cnae
    })), { onConflict: 'cnpj' });

  if (error) throw error;
  return data;
};

export const updateClientAIResult = async (clientId: string, analysis: SegmentAnalysis) => {
  const updates = {
    tipo_perfil: analysis.profile,
    cnae: analysis.cnae,
    ai_rationale: analysis.description,
    nome: analysis.foundCompany,
    cnpj: analysis.foundCnpj
  };

  const { error } = await supabase.from('clients').update(updates).eq('id', clientId);

  if (error && String(error.code) === '23505') {
    delete (updates as any).cnpj;
    await supabase.from('clients').update(updates).eq('id', clientId);
  }
};

export const fetchCampaignAudienceClients = async (filters: CampaignFilters, limit: number = 10000): Promise<Client[]> => {
  let query = supabase.from('clients').select('*');

  if (filters.profile) query = query.eq('tipo_perfil', filters.profile);
  if (filters.state && filters.state !== 'all') query = query.eq('estado', filters.state);
  if (filters.category && filters.category !== 'all') query = query.eq('classe_principal', filters.category);
  if (filters.potencia) query = query.ilike('potencia', `%${filters.potencia}%`);

  const { data, error } = await query.limit(limit);
  if (error) return [];
  return (data || []).map(mapDBToClient);
};

export const fetchCampaignSampleClients = async (filters: CampaignFilters, limit: number): Promise<Client[]> => {
  let query = supabase.from('clients').select('*').limit(limit);

  if (filters.profile) query = query.eq('tipo_perfil', filters.profile);
  if (filters.state && filters.state !== 'all') query = query.eq('estado', filters.state);
  if (filters.category && filters.category !== 'all') query = query.eq('classe_principal', filters.category);
  if (filters.potencia) query = query.ilike('potencia', `%${filters.potencia}%`);

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map(mapDBToClient);
};

export const fetchCampaignAudienceIds = async (filters: CampaignFilters, limit: number): Promise<string[]> => {
  let query = supabase.from('clients').select('id');

  if (filters.profile) query = query.eq('tipo_perfil', filters.profile);
  if (filters.state && filters.state !== 'all') query = query.eq('estado', filters.state);
  if (filters.category && filters.category !== 'all') query = query.eq('classe_principal', filters.category);
  if (filters.potencia) query = query.ilike('potencia', `%${filters.potencia}%`);

  const { data, error } = await query.limit(limit);
  if (error) return [];
  return (data || []).map(d => d.id);
};

export const fetchCampaignAudienceCount = async (filters: CampaignFilters): Promise<number> => {
  let query = supabase.from('clients').select('*', { count: 'exact', head: true });

  if (filters.profile) query = query.eq('tipo_perfil', filters.profile);
  if (filters.state && filters.state !== 'all') query = query.eq('estado', filters.state);
  if (filters.category && filters.category !== 'all') query = query.eq('classe_principal', filters.category);
  if (filters.potencia) query = query.ilike('potencia', `%${filters.potencia}%`);

  const { count, error } = await query;
  return error ? 0 : (count || 0);
};

export const createCampaign = async (campaign: Omit<Campaign, 'id' | 'createdAt'>, leadIds: string[] = []) => {
  const { data: campaignData, error: campaignError } = await supabase.from('campaigns').insert({
    name: campaign.name,
    segment_profile: campaign.segmentProfile,
    segment_region: campaign.segmentRegion,
    segment_category: campaign.segmentCategory,
    total_leads: campaign.totalLeads,
    email_subject: campaign.subject,
    email_body: campaign.emailBody || campaign.body,
    status: campaign.status
  }).select().single();

  if (campaignError) throw campaignError;

  // Vincula os leads na nova tabela campaign_leads
  if (leadIds.length > 0) {
    const links = leadIds.map(clientId => ({
      campaign_id: campaignData.id,
      client_id: clientId,
      status: 'pendente'
    }));

    const { error: linkError } = await supabase.from('campaign_leads').insert(links);
    if (linkError) console.error("Erro ao vincular leads:", linkError);
  }

  return campaignData;
};

export const fetchLeadsByCampaign = async (campaignId: string): Promise<Client[]> => {
  const { data, error } = await supabase
    .from('campaign_leads')
    .select(`
            client_id,
            clients (*)
        `)
    .eq('campaign_id', campaignId);

  if (error) return [];
  // d.clients é o objeto retornado pelo join do Supabase
  return (data || []).map((d: any) => mapDBToClient(d.clients));
};

export const deleteClientFromDB = async (clientId: string) => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId);

  if (error) throw error;
};

export const fetchLatestCampaign = async (): Promise<Campaign | null> => {
  const { data, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(1).single();
  if (error) return null;
  return {
    id: data.id,
    name: data.name,
    segmentProfile: data.segment_profile,
    segmentRegion: data.segment_region,
    segmentCategory: data.segment_category,
    totalLeads: data.total_leads,
    subject: data.email_subject,
    body: data.email_body,
    status: data.status as any,
    createdAt: data.created_at
  };
};

export const fetchAllCampaigns = async (): Promise<Campaign[]> => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];

  return data.map((d: any) => ({
    id: d.id,
    name: d.name,
    segmentProfile: d.segment_profile,
    segmentRegion: d.segment_region,
    segmentCategory: d.segment_category,
    totalLeads: d.total_leads,
    subject: d.email_subject,
    body: d.email_body,
    status: d.status as any,
    createdAt: d.created_at
  }));
};

/** 
 * GESTÃO DE NÚMEROS WHATSAPP (FLUKE + SUPABASE)
 */

export const fetchWhatsAppNumbers = async (): Promise<WhatsAppNumber[]> => {
  const { data, error } = await supabase
    .from('whatsapp_numbers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data.map(d => ({
    id: d.id,
    phoneNumber: d.phone_number,
    friendlyName: d.friendly_name,
    status: d.status,
    verificationCode: d.verification_code,
    createdAt: d.created_at
  }));
};

export const saveWhatsAppNumber = async (number: Omit<WhatsAppNumber, 'id' | 'createdAt'>) => {
  const { data, error } = await supabase
    .from('whatsapp_numbers')
    .insert({
      phone_number: number.phoneNumber,
      friendly_name: number.friendlyName,
      status: number.status,
      verification_code: number.verificationCode
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateWhatsAppNumberStatus = async (id: string, status: WhatsAppNumber['status'], verificationCode?: string) => {
  const { error } = await supabase
    .from('whatsapp_numbers')
    .update({ status, verification_code: verificationCode })
    .eq('id', id);

  if (error) throw error;
};

export const deleteWhatsAppNumber = async (id: string) => {
  const { error } = await supabase
    .from('whatsapp_numbers')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
