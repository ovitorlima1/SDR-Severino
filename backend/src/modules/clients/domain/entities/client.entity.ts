import { v4 as uuidv4 } from 'uuid';

export interface ClientProps {
  id: string;
  cnpj?: string;
  nome: string;
  municipio?: string;
  estado?: string;
  endereco?: string;
  clienteLivre?: string;
  microGerador?: string;
  nivelTensao?: string;
  classePrincipal?: string;
  subclasse?: string;
  potencia?: string;
  tipoTarifa?: string;
  tipoCliente?: string;
  dataDe?: string;
  dataAte?: string;
  contratoAtivo?: string;
  telFixo?: string;
  telMovel?: string;
  email?: string;
  cnae?: string;
  tipoPerfil?: string;
  aiRationale?: string;
  sourceBatch?: string;
  isDeleted: boolean;
  lat?: number;
  lng?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ClientEntity {
  private readonly props: ClientProps;

  private constructor(props: ClientProps) {
    this.props = props;
  }

  static create(props: Omit<ClientProps, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): ClientEntity {
    const now = new Date();
    return new ClientEntity({ ...props, id: uuidv4(), isDeleted: false, createdAt: now, updatedAt: now });
  }

  static restore(props: ClientProps): ClientEntity {
    return new ClientEntity(props);
  }

  softDelete(): void {
    (this.props as any).isDeleted = true;
    (this.props as any).updatedAt = new Date();
  }

  get id(): string { return this.props.id; }
  get cnpj(): string | undefined { return this.props.cnpj; }
  get nome(): string { return this.props.nome; }
  get municipio(): string | undefined { return this.props.municipio; }
  get estado(): string | undefined { return this.props.estado; }
  get endereco(): string | undefined { return this.props.endereco; }
  get clienteLivre(): string | undefined { return this.props.clienteLivre; }
  get microGerador(): string | undefined { return this.props.microGerador; }
  get nivelTensao(): string | undefined { return this.props.nivelTensao; }
  get classePrincipal(): string | undefined { return this.props.classePrincipal; }
  get subclasse(): string | undefined { return this.props.subclasse; }
  get potencia(): string | undefined { return this.props.potencia; }
  get tipoTarifa(): string | undefined { return this.props.tipoTarifa; }
  get tipoCliente(): string | undefined { return this.props.tipoCliente; }
  get dataDe(): string | undefined { return this.props.dataDe; }
  get dataAte(): string | undefined { return this.props.dataAte; }
  get contratoAtivo(): string | undefined { return this.props.contratoAtivo; }
  get telFixo(): string | undefined { return this.props.telFixo; }
  get telMovel(): string | undefined { return this.props.telMovel; }
  get email(): string | undefined { return this.props.email; }
  get cnae(): string | undefined { return this.props.cnae; }
  get tipoPerfil(): string | undefined { return this.props.tipoPerfil; }
  get aiRationale(): string | undefined { return this.props.aiRationale; }
  get sourceBatch(): string | undefined { return this.props.sourceBatch; }
  get isDeleted(): boolean { return this.props.isDeleted; }
  get lat(): number | undefined { return this.props.lat; }
  get lng(): number | undefined { return this.props.lng; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
}
