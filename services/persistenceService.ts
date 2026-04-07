
import { Client, SegmentAnalysis, Campaign, WhatsAppNumber, Prospect } from '../types';
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

  // Originação
  sourceBatch: dbData.source_batch,
  fornecedorEnergia: dbData.fornecedor_energia,
  isDeleted: dbData.is_deleted,
 
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
  sourceBatch?: string;
}

export const fetchAvailableBatches = async (): Promise<string[]> => {
  // Busca via import_history para pegar os nomes das bases importadas
  // (evita o problema de limite de 1000 linhas da tabela clients)
  const { data: historyData } = await supabase
    .from('import_history')
    .select('filename')
    .order('created_at', { ascending: false });

  if (historyData && historyData.length > 0) {
    const unique = Array.from(new Set(historyData.map((d: any) => d.filename as string).filter(Boolean)));
    return unique.sort();
  }

  // Fallback: busca diretamente da tabela clients com limit alto
  const { data, error } = await supabase
    .from('clients')
    .select('source_batch')
    .not('source_batch', 'is', null)
    .neq('source_batch', '')
    .limit(100000);

  if (error || !data) return [];

  const unique = Array.from(new Set(data.map((d: any) => d.source_batch as string).filter(Boolean)));
  return unique.sort();
};

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
    .eq('is_deleted', false) // Só traz os não excluídos
    .order('created_at', { ascending: false })
    .limit(100000);

  if (error) return [];
  return (data || []).map(mapDBToClient);
};

export const fetchTotalClientsCount = async (): Promise<number> => {
  const { count, error } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_deleted', false);
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
    .upsert(clients.map(c => {
      const payload: any = {
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
        cnae: c.cnae,
        source_batch: c.sourceBatch,
        fornecedor_energia: c.fornecedorEnergia || null,
        is_deleted: false
      };

      // Só sobrescreve perfil se o dado importado tiver um perfil definido
      if (c.profile && c.profile !== 'Não Segmentado') {
        payload.tipo_perfil = c.profile;
      }

      return payload;
    }), { onConflict: 'cnpj' });

  if (error) throw error;
  
  // Registrar histórico se houver um nome de lote
  const batchName = clients[0]?.sourceBatch;
  if (batchName && clients.length > 0) {
      // Simplificado: Supomos que o batchName é consistente
      await supabase.from('import_history').insert({
          filename: batchName,
          total_rows: clients.length,
          new_leads: clients.length, // Placeholder, idealmente compararíamos
          updated_leads: 0
      });
  }

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
  if (filters.potencia && filters.potencia !== '0') {
    const numValue = parseInt(filters.potencia);
    if (!isNaN(numValue) && numValue > 0) {
      query = query.gte('potencia', filters.potencia);
    } else {
      query = query.ilike('potencia', `%${filters.potencia}%`);
    }
  }
  if (filters.sourceBatch && filters.sourceBatch !== 'all') query = query.eq('source_batch', filters.sourceBatch);

  const { data, error } = await query.limit(limit);
  if (error) return [];
  return (data || []).map(mapDBToClient);
};

export const fetchCampaignSampleClients = async (filters: CampaignFilters, limit: number): Promise<Client[]> => {
  let query = supabase.from('clients').select('*').limit(limit);

  if (filters.profile) query = query.eq('tipo_perfil', filters.profile);
  if (filters.state && filters.state !== 'all') query = query.eq('estado', filters.state);
  if (filters.category && filters.category !== 'all') query = query.eq('classe_principal', filters.category);
  if (filters.potencia && filters.potencia !== '0') {
    const numValue = parseInt(filters.potencia);
    if (!isNaN(numValue) && numValue > 0) {
      query = query.gte('potencia', filters.potencia);
    } else {
      query = query.ilike('potencia', `%${filters.potencia}%`);
    }
  }
  if (filters.sourceBatch && filters.sourceBatch !== 'all') query = query.eq('source_batch', filters.sourceBatch);

  const { data, error } = await query;
  if (error) return [];
  return (data || []).map(mapDBToClient);
};

export const fetchCampaignAudienceIds = async (filters: CampaignFilters, limit: number): Promise<string[]> => {
  let query = supabase.from('clients').select('id');

  if (filters.profile) query = query.eq('tipo_perfil', filters.profile);
  if (filters.state && filters.state !== 'all') query = query.eq('estado', filters.state);
  if (filters.category && filters.category !== 'all') query = query.eq('classe_principal', filters.category);
  if (filters.potencia && filters.potencia !== '0') {
    const numValue = parseInt(filters.potencia);
    if (!isNaN(numValue) && numValue > 0) {
      query = query.gte('potencia', filters.potencia);
    } else {
      query = query.ilike('potencia', `%${filters.potencia}%`);
    }
  }
  if (filters.sourceBatch && filters.sourceBatch !== 'all') query = query.eq('source_batch', filters.sourceBatch);

  const { data, error } = await query.limit(limit);
  if (error) return [];
  return (data || []).map(d => d.id);
};

export const fetchCampaignAudienceCount = async (filters: CampaignFilters): Promise<number> => {
  let query = supabase.from('clients').select('*', { count: 'exact', head: true });

  if (filters.profile) query = query.eq('tipo_perfil', filters.profile);
  if (filters.state && filters.state !== 'all') query = query.eq('estado', filters.state);
  if (filters.category && filters.category !== 'all') query = query.eq('classe_principal', filters.category);
  if (filters.potencia && filters.potencia !== '0') {
    const numValue = parseInt(filters.potencia);
    if (!isNaN(numValue) && numValue > 0) {
      query = query.gte('potencia', filters.potencia);
    } else {
      query = query.ilike('potencia', `%${filters.potencia}%`);
    }
  }
  if (filters.sourceBatch && filters.sourceBatch !== 'all') query = query.eq('source_batch', filters.sourceBatch);

  const { count, error } = await query;
  return error ? 0 : (count || 0);
};

export const createCampaign = async (campaign: Omit<Campaign, 'id' | 'createdAt'>, leadIds: string[] = []) => {
  const insertPayload: Record<string, any> = {
    name: campaign.name,
    segment_profile: campaign.segmentProfile,
    segment_region: campaign.segmentRegion,
    segment_category: campaign.segmentCategory,
    total_leads: campaign.totalLeads,
    email_subject: campaign.subject,
    email_body: campaign.body || campaign.emailBody,
    status: campaign.status
  };

  if (campaign.campaignDate) {
    insertPayload.created_at = campaign.campaignDate;
  }

  const { data: campaignData, error: campaignError } = await supabase.from('campaigns').insert(insertPayload).select().single();

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

export const fetchCampaignsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true });
  return error ? 0 : (count || 0);
};

export const fetchCampaignsByRegion = async (): Promise<{ name: string; value: number }[]> => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('segment_region');
  if (error || !data) return [];

  const map: Record<string, number> = {};
  data.forEach((d: any) => {
    const region = d.segment_region || 'Todos';
    map[region] = (map[region] || 0) + 1;
  });

  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

export const fetchLeadsInCampaignsCount = async (): Promise<number> => {
  const { data, error } = await supabase
    .from('campaign_leads')
    .select('client_id');
  if (error || !data) return 0;
  return new Set(data.map((d: any) => d.client_id)).size;
};

/**
 * ORIGINAÇÃO E KPIS DE BASE
 */

export const fetchOriginationStats = async (): Promise<any> => {
    const { data, error } = await supabase.rpc('get_origination_stats');
    if (error) return { totalBatches: 0, totalImported: 0, totalDeleted: 0, enrichmentRate: 0 };
    return {
        totalBatches: data[0].total_batches,
        totalImported: data[0].total_imported,
        totalDeleted: data[0].total_deleted,
        enrichmentRate: data[0].enrichment_rate
    };
};

export const fetchImportHistory = async (): Promise<any[]> => {
    const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) return [];
    return data.map(d => ({
        id: d.id,
        filename: d.filename,
        totalRows: d.total_rows,
        newLeads: d.new_leads,
        updatedLeads: d.updated_leads,
        createdAt: d.created_at
    }));
};

export const deleteClientsByBatch = async (batchName: string) => {
    // 1. Logar exclusão (conforme o schema do usuário)
    const { data: clientsToLog } = await supabase
        .from('clients')
        .select('name, source_batch')
        .eq('source_batch', batchName);
    
    if (clientsToLog && clientsToLog.length > 0) {
        const logs = clientsToLog.map(c => ({
            client_name: c.name,
            source_batch: c.source_batch
        }));
        await supabase.from('deletion_logs').insert(logs);
    }

    // 2. Marcar como excluído (Soft Delete)
    const { error } = await supabase
        .from('clients')
        .update({ is_deleted: true })
        .eq('source_batch', batchName);

    if (error) throw error;
};

// =============================================================================
// PROSPECT HUB
// =============================================================================

const mapDBToProspect = (d: any): Prospect => ({
  id: d.id,
  nome: d.nome || 'Sem Nome',
  cnpj: d.cnpj,
  estado: d.estado,
  municipio: d.municipio,
  classe: d.classe,
  tarifa: d.tarifa,
  potencia: d.potencia != null ? Number(d.potencia) : undefined,
  nivelTensao: d.nivel_tensao,
  clienteLivre: d.cliente_livre,
  email: d.email,
  tel: d.tel,
  score: d.score ?? 0,
  segmento: d.segmento ?? 'C',
  distribuidora: d.distribuidora,
  sourceFile: d.source_file,
});

export interface ProspectStats {
  baseTotal: number;
  qualificados: number;
  segA: number;
  segB: number;
  cnpjValido: number;
  porDistribuidora: { distribuidora: string; total: number; segA: number }[];
}

const DISTRIBUIDORAS_EQUATORIAL = [
  'Equatorial Alagoas',
  'Equatorial Goiás',
  'Equatorial Maranhão',
  'Equatorial Pará',
  'Equatorial Piauí',
  'CEEE Equatorial (RS)',
  'CEA Equatorial',
];

export const fetchProspectStats = async (): Promise<ProspectStats> => {
  // Queries de contagem globais + contagens individuais por distribuidora
  // (evita o limite de 1000 linhas do Supabase em queries de dados)
  const distQueries = DISTRIBUIDORAS_EQUATORIAL.flatMap(d => [
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('distribuidora', d),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('distribuidora', d).eq('segmento', 'A'),
  ]);

  const [resTotal, resQual, resSegA, resSegB, resCnpj, ...distResults] = await Promise.all([
    supabase.from('prospects').select('*', { count: 'exact', head: true }),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).in('segmento', ['A', 'B']),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('segmento', 'A'),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).eq('segmento', 'B'),
    supabase.from('prospects').select('*', { count: 'exact', head: true }).not('cnpj', 'is', null),
    ...distQueries,
  ]);

  // Reconstrói porDistribuidora a partir dos pares de resultados (total, segA)
  const porDistribuidora = DISTRIBUIDORAS_EQUATORIAL
    .map((distribuidora, i) => ({
      distribuidora,
      total: distResults[i * 2]?.count ?? 0,
      segA: distResults[i * 2 + 1]?.count ?? 0,
    }))
    .filter(d => d.total > 0)
    .sort((a, b) => b.segA - a.segA);

  return {
    baseTotal: resTotal.count ?? 0,
    qualificados: resQual.count ?? 0,
    segA: resSegA.count ?? 0,
    segB: resSegB.count ?? 0,
    cnpjValido: resCnpj.count ?? 0,
    porDistribuidora,
  };
};

export interface ProspectFilters {
  segmento?: string;
  estado?: string;
  distribuidora?: string;
  contato?: string;  // 'email' | 'tel' | 'ambos'
  search?: string;
}

export const fetchProspects = async (
  filters: ProspectFilters = {},
  page = 0,
  pageSize = 50
): Promise<{ data: Prospect[]; count: number }> => {
  let query = supabase
    .from('prospects')
    .select('*', { count: 'exact' })
    .order('score', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (filters.segmento) query = query.eq('segmento', filters.segmento);
  if (filters.estado)   query = query.eq('estado', filters.estado);
  if (filters.distribuidora) query = query.eq('distribuidora', filters.distribuidora);
  if (filters.contato === 'email')  query = query.not('email', 'is', null);
  if (filters.contato === 'tel')    query = query.not('tel', 'is', null);
  if (filters.contato === 'ambos')  query = query.not('email', 'is', null).not('tel', 'is', null);
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(`nome.ilike.${term},cnpj.ilike.${term},municipio.ilike.${term}`);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data ?? []).map(mapDBToProspect),
    count: count ?? 0,
  };
};

