import { ClientEntity } from '../entities/client.entity';

export const CLIENT_REPOSITORY = 'CLIENT_REPOSITORY';

export interface ClientFilters {
  profile?: string;
  state?: string;
  category?: string;
  potencia?: string;
  isDeleted?: boolean;
}

export interface IClientRepository {
  findAll(filters?: ClientFilters): Promise<ClientEntity[]>;
  findById(id: string): Promise<ClientEntity | null>;
  findByCnpj(cnpj: string): Promise<ClientEntity | null>;
  create(client: ClientEntity): Promise<ClientEntity>;
  update(client: ClientEntity): Promise<ClientEntity>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  softDeleteByBatch(batchName: string): Promise<void>;
  upsertMany(clients: ClientEntity[]): Promise<void>;
  count(filters?: ClientFilters): Promise<number>;
  findPending(limit: number): Promise<ClientEntity[]>;
  findDistinctPotencias(): Promise<string[]>;
}
