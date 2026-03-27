
import { GoogleGenAI, Type } from "@google/genai";
import { KommoNote, LeadSentimentAnalysis, SentimentLabel } from '../types';

const MODEL_NAME = 'gemini-3-flash-preview';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 3000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit =
        JSON.stringify(error).includes('429') ||
        JSON.stringify(error).includes('RESOURCE_EXHAUSTED');
      if (isRateLimit && i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, initialDelay * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

const sentimentSchema = {
  type: Type.OBJECT,
  properties: {
    sentiment: { type: Type.STRING, enum: ['positivo', 'negativo', 'neutro'] },
    confidence: { type: Type.INTEGER },
    keyTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
  },
  required: ['sentiment', 'confidence', 'keyTopics', 'summary'],
};

export const analyzeLeadSentiment = async (
  leadId: number,
  leadName: string,
  stageName: string,
  notes: KommoNote[]
): Promise<LeadSentimentAnalysis | null> => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');

  const textNotes = notes
    .filter(n => n.params?.text && n.params.text.trim().length > 0)
    .map(n =>
      `[${new Date(n.created_at * 1000).toLocaleDateString('pt-BR')}] ${n.params.text}`
    )
    .join('\n');

  if (!textNotes) return null;

  const ai = new GoogleGenAI({ apiKey });

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Você é Severino, especialista em análise de relacionamento comercial da Billi Capital.

Analise o histórico de notas/conversas do lead abaixo e retorne a análise de sentimento.

LEAD: "${leadName}" | ETAPA: "${stageName}"

HISTÓRICO DE NOTAS:
${textNotes}

INSTRUÇÕES:
- sentiment: classifique o sentimento geral do cliente como 'positivo', 'negativo' ou 'neutro'
- confidence: sua confiança na classificação (0-100)
- keyTopics: até 4 tópicos-chave identificados (ex: 'objeção de preço', 'interesse em proposta', 'urgência')
- summary: resumo em uma frase do estado do relacionamento com este lead`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: sentimentSchema,
        temperature: 0.3,
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      leadId,
      leadName,
      stageName,
      sentiment: result.sentiment as SentimentLabel,
      confidence: result.confidence,
      keyTopics: result.keyTopics,
      summary: result.summary,
      noteCount: notes.length,
      analyzedAt: new Date().toISOString(),
    };
  });
};

export const analyzeBatchLeadSentiment = async (
  items: { leadId: number; leadName: string; stageName: string; notes: KommoNote[] }[]
): Promise<LeadSentimentAnalysis[]> => {
  const results: LeadSentimentAnalysis[] = [];
  for (const item of items) {
    try {
      const analysis = await analyzeLeadSentiment(
        item.leadId,
        item.leadName,
        item.stageName,
        item.notes
      );
      if (analysis) results.push(analysis);
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error(`[Severino] Erro ao analisar sentimento do lead ${item.leadId}:`, e);
    }
  }
  return results;
};
