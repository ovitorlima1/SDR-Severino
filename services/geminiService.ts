
import { GoogleGenAI, Type } from "@google/genai";
import { Client, SegmentAnalysis, MessageTemplate, BilliAnalysis } from '../types';

// O modelo Flash tem cotas muito maiores que o Pro para processamento em massa
// Modelo Flash 1.5 para maior compatibilidade com todas as API Keys
const MODEL_NAME = 'gemini-3-flash-preview';

// Função utilitária para retry com backoff exponencial
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 3000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorStr = JSON.stringify(error);
      const isRateLimit = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED');

      if (isRateLimit && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`[Severino] Limite atingido. Aguardando ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/**
 * Analisa um único cliente usando busca na web e IA
 */
export const analyzeSingleSegment = async (client: Client): Promise<SegmentAnalysis | null> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) {
    console.error("[Severino] API Key não encontrada!");
    throw new Error("Configuração ausente: API Key");
  }

  const ai = new GoogleGenAI({ apiKey });

  const companyInfo = {
    id: client.id,
    company: client.company || client.name,
    cnpj: client.cnpj
  };

  const schema = {
    type: Type.OBJECT,
    properties: {
      clientId: { type: Type.STRING },
      foundCompany: { type: Type.STRING },
      foundCnpj: { type: Type.STRING },
      segmentName: { type: Type.STRING },
      category: { type: Type.STRING },
      state: { type: Type.STRING },
      cnae: { type: Type.STRING },
      profile: { type: Type.STRING },
      description: { type: Type.STRING }
    },
    required: ['clientId', 'foundCompany', 'foundCnpj', 'segmentName', 'category', 'state', 'cnae', 'profile', 'description']
  };

  return withRetry(async () => {
    try {
      console.log(`[Severino] Chamando API para lead: ${client.name} (id: ${client.id}) com modelo: ${MODEL_NAME}`);
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `VOCÊ É O SEVERINO, ESPECIALISTA EM ENRIQUECIMENTO DE DADOS PARA A BILLI CAPITAL.
        MISSÃO: 
        1. Use 'googleSearch' para encontrar os dados oficiais (CNPJ, Razão Social, CNAE) da empresa abaixo.
        2. Atualize os dados cadastrais.
        3. Defina o Perfil Comportamental conforme os padrões Billi:
           - ARQUITETO FINANCEIRO: Foco em eficiência, engenharia de contratos e margem.
           - PAGADOR: Foco em honrar compromissos, estabilidade e proteção de caixa.
           - OPORTUNISTA: Foco em liquidez rápida, timing e vantagens imediatas.
           - GESTOR: Foco em controle, processos e organização de longo prazo.
        
        EMPRESA ALVO: ${JSON.stringify(companyInfo)}`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      console.log(`[Severino] Resposta recebida para ${client.name}`);
      const result = response.text ? JSON.parse(response.text) : null;
      if (result) console.log(`[Severino] Sucesso para o lead: ${client.name}`);
      return result;
    } catch (error) {
      console.error(`Erro ao processar cliente ${client.id}:`, error);
      // Re-throw para o withRetry capturar
      throw error;
    }
  });
};

export const analyzeSegments = async (clients: Client[]): Promise<SegmentAnalysis[]> => {
  const results: SegmentAnalysis[] = [];
  for (const client of clients) {
    const res = await analyzeSingleSegment(client);
    if (res) results.push(res);
    await new Promise(r => setTimeout(r, 1500));
  }
  return results;
};

/**
 * GERAÇÃO DE CAMPANHAS COM LÓGICA BILLI CAPITAL
 */
export const generateCampaignMessage = async (
  profile: string,
  contextInfo: { state: string, sector: string, potential: string },
  clients: Client[]
): Promise<MessageTemplate> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const sampleData = Array.isArray(clients)
    ? clients.slice(0, 5).map(c => `${c.name || 'Empresa'} (${c.state || 'Região'} - ${c.classePrincipal || 'Setor'} - ${c.potencia || 'Porte'})`).join('; ')
    : 'Diversas empresas do setor';

  const schema = {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING, description: "Assunto chamativo para o e-mail" },
      emailBody: { type: Type.STRING, description: "Corpo do e-mail estratégico" },
      whatsappBody: { type: Type.STRING, description: "Mensagem curta para WhatsApp" },
      linkedinBody: { type: Type.STRING, description: "Mensagem de conexão LinkedIn" },
      segmentName: { type: Type.STRING }
    },
    required: ['subject', 'emailBody', 'whatsappBody', 'linkedinBody', 'segmentName']
  };

  const systemPrompt = `Você é um Copywriter Sênior especializado em Mercado Financeiro e Engenharia de Capital na Billi Capital (billicapital.com.br).
  A Billi transforma previsibilidade financeira (contas de energia, fluxos futuros) em liquidez imediata.
  
  MISSÃO: Criar uma campanha de outbound em 3 canais (E-mail, WhatsApp, LinkedIn).
  
  DADOS DA SEGMENTAÇÃO:
  - Perfil: ${profile}
  - Estado: ${contextInfo.state}
  - Setor: ${contextInfo.sector}
  - Potencial: ${contextInfo.potential}
  - Exemplos de Alvos: ${sampleData}
  
  REGRAS DE IMPACTO:
  1. CONTEXTO REGIONAL: Use o fato de estarem em ${contextInfo.state} para criar proximidade.
  2. CONTEXTO SETORIAL: Fale a língua de quem atua no setor ${contextInfo.sector}.
  3. CALIBRAGEM DE POTÊNCIA: Se o potencial for ${contextInfo.potential}, adapte a tese de investimento (ex: Alta Voltagem foca em economia de escala, Baixa em eficiência operacional).
  4. ALVOS REAIS: Use os exemplos fornecidos (${sampleData}) para nortear o tom das mensagens, tornando-as extremamente específicas para esse grupo.
  
  ADAPTAÇÃO POR PERFIL (${profile}):
  - Arquiteto Financeiro: Mensagens focadas em estrutura de capital, ROI e eficiência tributária/energética.
  - Pagador: Foco em estabilidade, redução de custos fixos e segurança financeira.
  - Oportunista: Foco em ganhos rápidos, arbitragem e vantagem competitiva.
  - Gestor: Foco em conformidade, controle de custos e governança.
  
  Gere uma abordagem de alto impacto para cada canal. Assine como 'Time Billi Capital'.`;

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: systemPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.8
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error(error);
      throw new Error("Falha ao gerar mensagens Billi.");
    }
  });
};

export const qualifyCompany = async (companyOrCnpj: string): Promise<BilliAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  const cleanInput = companyOrCnpj.replace(/[^\d]/g, '');
  const isCnpjInput = cleanInput.length === 14;
  const searchTerm = isCnpjInput ? cleanInput.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : companyOrCnpj;

  const schema = {
    type: Type.OBJECT,
    properties: {
      identification: {
        type: Type.OBJECT,
        properties: {
          razaoSocial: { type: Type.STRING },
          cnpj: { type: Type.STRING },
          cnae: { type: Type.STRING },
          localizacao: { type: Type.STRING },
          ecossistema: { type: Type.STRING }
        },
        required: ['razaoSocial', 'cnpj', 'cnae', 'localizacao', 'ecossistema']
      },
      eixos: {
        type: Type.OBJECT,
        properties: {
          eixo1: { type: Type.OBJECT, properties: { sinais: { type: Type.ARRAY, items: { type: Type.STRING } }, veredito: { type: Type.STRING } } },
          eixo2: { type: Type.OBJECT, properties: { sinais: { type: Type.ARRAY, items: { type: Type.STRING } }, veredito: { type: Type.STRING } } }
        },
        required: ['eixo1', 'eixo2']
      },
      scoring: {
        type: Type.OBJECT,
        properties: {
          maturity: { type: Type.OBJECT, properties: { evidence: { type: Type.STRING }, points: { type: Type.INTEGER } } },
          energy: { type: Type.OBJECT, properties: { evidence: { type: Type.STRING }, points: { type: Type.INTEGER } } },
          capital: { type: Type.OBJECT, properties: { evidence: { type: Type.STRING }, points: { type: Type.INTEGER } } },
          language: { type: Type.OBJECT, properties: { evidence: { type: Type.STRING }, points: { type: Type.INTEGER } } },
          total: { type: Type.INTEGER }
        },
        required: ['maturity', 'energy', 'capital', 'language', 'total']
      },
      profile: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          name: { type: Type.STRING },
          reason: { type: Type.STRING },
          pain: { type: Type.STRING },
          opportunity: { type: Type.STRING }
        },
        required: ['code', 'name', 'reason', 'pain', 'opportunity']
      },
      nextSteps: {
        type: Type.OBJECT,
        properties: {
          donts: { type: Type.ARRAY, items: { type: Type.STRING } },
          do: { type: Type.OBJECT, properties: { narrative: { type: Type.STRING }, trigger: { type: Type.STRING } } }
        },
        required: ['donts', 'do']
      }
    },
    required: ['identification', 'eixos', 'scoring', 'profile', 'nextSteps']
  };

  const prompt = isCnpjInput
    ? `AUDITORIA CADASTRAL BILLI: Pesquise EXATAMENTE o CNPJ: "${searchTerm}" no Google e retorne a análise estratégica.`
    : `BUSCA EMPRESARIAL BILLI: Encontre o CNPJ MATRIZ da empresa "${searchTerm}" no Google e retorne a análise estratégica.`;

  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });

      const output = JSON.parse(response.text || '{}') as BilliAnalysis;
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(c => ({ title: c.web?.title || 'Fonte', uri: c.web?.uri || '' })).filter(s => s.uri) || [];

      return { ...output, sources: sources.slice(0, 5) };
    } catch (error) {
      console.error(error);
      throw new Error("Falha na qualificação.");
    }
  });
};
