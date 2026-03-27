
import { KommoLead, KommoStage, KommoNote, KommoTalk, InactiveLead } from '../types';

export type { KommoLead, KommoStage };

const BASE_URL = '/kommo-api/api/v4';

const headers = () => ({
  'Content-Type': 'application/json',
});

export const fetchKommoLeads = async (): Promise<KommoLead[]> => {
  const all: KommoLead[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(`${BASE_URL}/leads?limit=250&page=${page}`, { headers: headers() });

    if (res.status === 204 || res.status === 404) break;
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`Kommo leads error (${res.status}):`, body);
      throw new Error(`KOMMO_ERROR_${res.status}: ${body || res.statusText}`);
    }

    const json = await res.json();
    const items: KommoLead[] = json._embedded?.leads ?? [];
    all.push(...items);

    if (!json._links?.next) break;
    page++;
  }

  return all;
};

export const fetchKommoStages = async (): Promise<KommoStage[]> => {
  const res = await fetch(`${BASE_URL}/leads/pipelines?limit=250`, { headers: headers() });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Kommo pipelines error (${res.status}):`, body);
    throw new Error(`KOMMO_ERROR_${res.status}: ${body || res.statusText}`);
  }

  const json = await res.json();
  const pipelines: any[] = json._embedded?.pipelines ?? [];

  const stages: KommoStage[] = [];
  for (const pipeline of pipelines) {
    const statuses: any[] = pipeline._embedded?.statuses ?? [];
    for (const status of statuses) {
      stages.push({
        id: status.id,
        name: status.name,
        color: status.color ?? '#94a3b8',
        pipeline_id: pipeline.id,
        pipeline_name: pipeline.name,
      });
    }
  }

  return stages;
};

// Extrai texto de qualquer campo possível de nota (params variam por tipo)
const getAnyText = (note: any): string | null => {
  const p = note?.params;
  const text = p?.text || p?.body || p?.content || p?.message || null;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
};

export const getNoteDisplayText = (note: KommoNote): string => {
  const text = getAnyText(note);
  if (text) return text;
  switch (note.note_type) {
    case 'call_in':  return `📞 Ligação recebida${note.params?.phone ? ` de ${note.params.phone}` : ''}`;
    case 'call_out': return `📞 Ligação realizada${note.params?.phone ? ` para ${note.params.phone}` : ''}`;
    case 'file':     return '📎 Arquivo anexado';
    case 'sms':      return '💬 SMS enviado';
    default:         return `[${note.note_type}]`;
  }
};

// Busca última mensagem via API de Talks (conversas WhatsApp/chat)
const fetchLastTalkMessage = async (leadId: number): Promise<KommoNote | null> => {
  try {
    const talksRes = await fetch(
      `${BASE_URL}/talks?filter[entity_id][]=${leadId}&limit=10`,
      { headers: headers() }
    );
    if (!talksRes.ok) return null;

    const talksJson: any = await talksRes.json();
    const talks: any[] = talksJson._embedded?.talks ?? [];

    // Filtra client-side pelo leadId (filtro server-side pode não ser preciso)
    const leadTalks = talks.filter((t: any) => t.entity_id === leadId);
    if (!leadTalks.length) return null;

    const latestTalk = leadTalks.sort((a: any, b: any) => (b.updated_at || 0) - (a.updated_at || 0))[0];
    const contactId: number | null = latestTalk.contact_id ?? null;
    if (!contactId) return null;

    // Mensagens WhatsApp ficam nas notas do contato
    const notesRes = await fetch(
      `${BASE_URL}/contacts/${contactId}/notes?limit=50`,
      { headers: headers() }
    );
    if (!notesRes.ok) return null;

    const notesJson: any = await notesRes.json();
    const notes: any[] = notesJson._embedded?.notes ?? [];
    const sorted = notes.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
    return sorted.find((n: any) => getAnyText(n)) ?? sorted[0] ?? null;
  } catch {
    return null;
  }
};

export const fetchLastLeadNote = async (leadId: number): Promise<KommoNote | null> => {
  // 1. Tenta API de Talks (WhatsApp Business / chat)
  const talkMsg = await fetchLastTalkMessage(leadId);
  if (talkMsg) return talkMsg;

  // 2. Fallback: notas do lead
  const notesRes = await fetch(`${BASE_URL}/leads/${leadId}/notes?limit=50`, { headers: headers() });
  if (!notesRes.ok) return null;

  const notesJson: any = await notesRes.json();
  const notes: KommoNote[] = notesJson._embedded?.notes ?? [];
  const sorted = [...notes].sort((a, b) => b.created_at - a.created_at);
  return sorted.find(n => getAnyText(n)) ?? sorted[0] ?? null;
};

export const fetchLeadNotes = async (leadId: number): Promise<KommoNote[]> => {
  const all: KommoNote[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `${BASE_URL}/leads/${leadId}/notes?limit=250&page=${page}`,
      { headers: headers() }
    );

    if (res.status === 204 || res.status === 404) break;
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`KOMMO_NOTES_ERROR_${res.status}: ${body || res.statusText}`);
    }

    const json = await res.json();
    const items: KommoNote[] = json._embedded?.notes ?? [];
    all.push(...items);

    if (!json._links?.next) break;
    page++;
  }

  return all;
};

export const fetchAllLeadTalkMessages = async (leadId: number): Promise<KommoNote[]> => {
  try {
    const talksRes = await fetch(
      `${BASE_URL}/talks?filter[entity_id][]=${leadId}&limit=10`,
      { headers: headers() }
    );
    if (!talksRes.ok) return [];

    const talksJson: any = await talksRes.json();
    const talks: any[] = talksJson._embedded?.talks ?? [];
    const leadTalks = talks.filter((t: any) => t.entity_id === leadId);
    if (!leadTalks.length) return [];

    const latestTalk = leadTalks.sort((a: any, b: any) => (b.updated_at || 0) - (a.updated_at || 0))[0];
    const contactId: number | null = latestTalk.contact_id ?? null;
    if (!contactId) return [];

    const all: KommoNote[] = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `${BASE_URL}/contacts/${contactId}/notes?limit=250&page=${page}`,
        { headers: headers() }
      );
      if (res.status === 204 || res.status === 404) break;
      if (!res.ok) break;
      const json = await res.json();
      const items: KommoNote[] = json._embedded?.notes ?? [];
      all.push(...items);
      if (!json._links?.next) break;
      page++;
    }
    return all;
  } catch {
    return [];
  }
};

// Busca TODAS as notas de um contato diretamente pelo contact_id (sem re-consultar /talks)
export const fetchAllContactNotes = async (contactId: number): Promise<KommoNote[]> => {
  const all: KommoNote[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(
      `${BASE_URL}/contacts/${contactId}/notes?limit=250&page=${page}`,
      { headers: headers() }
    );
    if (res.status === 204 || res.status === 404) break;
    if (!res.ok) break;
    const json = await res.json();
    const items: KommoNote[] = json._embedded?.notes ?? [];
    all.push(...items);
    if (!json._links?.next) break;
    page++;
  }
  return all;
};

// Busca mensagens do chat via UUID chat_id (endpoint correto para WABA/WhatsApp)
export const fetchChatMessages = async (chatId: string): Promise<KommoNote[]> => {
  if (!chatId) return [];
  try {
    const res = await fetch(
      `${BASE_URL}/chats/${chatId}/messages?limit=250`,
      { headers: headers() }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const messages: any[] = json._embedded?.messages ?? [];
    return messages.map((m: any) => ({
      id: m.id,
      lead_id: 0,
      note_type: 'talk_message',
      params: { text: m.text ?? m.content ?? m.body ?? m.message ?? '' },
      created_at: m.created_at ?? m.timestamp ?? 0,
      updated_at: m.updated_at ?? 0,
      created_by: m.author?.id ?? m.created_by ?? 0,
    }));
  } catch {
    return [];
  }
};

export const fetchAllActiveChats = async (): Promise<KommoTalk[]> => {
  try {
    const res = await fetch(`${BASE_URL}/talks?limit=250`, { headers: headers() });
    if (!res.ok) return [];
    const json = await res.json();
    const raw: any[] = json._embedded?.talks ?? [];
    // A API retorna 'talk_id', não 'id' — normaliza para o tipo KommoTalk
    return raw.map((t: any) => ({
      talk_id: t.talk_id,
      entity_id: t.entity_id,
      contact_id: t.contact_id,
      chat_id: t.chat_id ?? '',
      updated_at: t.updated_at ?? 0,
      created_at: t.created_at ?? 0,
      status: t.status,
      origin: t.origin,
    }));
  } catch {
    return [];
  }
};

export const fetchLastContactNote = async (contactId: number): Promise<KommoNote | null> => {
  try {
    const res = await fetch(`${BASE_URL}/contacts/${contactId}/notes?limit=50`, { headers: headers() });
    if (!res.ok) return null;
    const json = await res.json();
    const notes: any[] = json._embedded?.notes ?? [];
    const sorted = notes.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    return sorted.find((n: any) => getAnyText(n)) ?? sorted[0] ?? null;
  } catch {
    return null;
  }
};

export const fetchKommoLeadsByStage = async (statusId: number): Promise<KommoLead[]> => {
  const all: KommoLead[] = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}/leads?limit=250&page=${page}&filter[status_id]=${statusId}`;
    const res = await fetch(url, { headers: headers() });

    if (res.status === 204 || res.status === 404) break;
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`KOMMO_ERROR_${res.status}: ${body || res.statusText}`);
    }

    const json = await res.json();
    const items: KommoLead[] = json._embedded?.leads ?? [];
    all.push(...items);

    if (!json._links?.next) break;
    page++;
  }

  return all;
};

const WON_STATUS = 142;
const LOST_STATUS = 143;

export const filterInactiveHighValueLeads = (
  leads: KommoLead[],
  stages: KommoStage[],
  thresholdDays: number = 30,
  minPrice: number = 0
): InactiveLead[] => {
  const nowSec = Math.floor(Date.now() / 1000);
  const thresholdSec = thresholdDays * 86400;
  const stageById = Object.fromEntries(stages.map(s => [s.id, s]));

  return leads
    .filter(l =>
      l.status_id !== WON_STATUS &&
      l.status_id !== LOST_STATUS &&
      l.price >= minPrice &&
      l.updated_at > 0 &&
      (nowSec - l.updated_at) >= thresholdSec
    )
    .map(l => {
      const stage = stageById[l.status_id];
      return {
        lead: l,
        stageName: stage?.name ?? 'Desconhecida',
        stageColor: stage?.color ?? '#94a3b8',
        pipelineName: stage?.pipeline_name ?? '',
        daysSinceUpdate: Math.floor((nowSec - l.updated_at) / 86400),
        pipelineValue: l.price,
      };
    })
    .sort((a, b) => b.pipelineValue - a.pipelineValue);
};
