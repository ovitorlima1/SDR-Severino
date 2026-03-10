
export interface KommoLead {
  id: number;
  name: string;
  status_id: number;
  pipeline_id: number;
  price: number;
  created_at: number; // unix timestamp
}

export interface KommoStage {
  id: number;
  name: string;
  color: string;
  pipeline_id: number;
  pipeline_name: string;
}

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
