import { z } from 'zod';

export const createClientSchema = z.object({
  cnpj: z.string().optional(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  municipio: z.string().optional(),
  estado: z.string().optional(),
  endereco: z.string().optional(),
  clienteLivre: z.string().optional(),
  microGerador: z.string().optional(),
  nivelTensao: z.string().optional(),
  classePrincipal: z.string().optional(),
  subclasse: z.string().optional(),
  potencia: z.string().optional(),
  tipoTarifa: z.string().optional(),
  tipoCliente: z.string().optional(),
  dataDe: z.string().optional(),
  dataAte: z.string().optional(),
  contratoAtivo: z.string().optional(),
  telFixo: z.string().optional(),
  telMovel: z.string().optional(),
  email: z.string().optional(),
  cnae: z.string().optional(),
  tipoPerfil: z.string().optional(),
  sourceBatch: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const updateClientSchema = createClientSchema.partial();
export const importClientsSchema = z.array(createClientSchema);

export type CreateClientDto = z.infer<typeof createClientSchema>;
export type UpdateClientDto = z.infer<typeof updateClientSchema>;
export type ImportClientsDto = z.infer<typeof importClientsSchema>;
