import { v4 as uuidv4 } from 'uuid';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  createdAt: Date;
}

export class UserEntity {
  private readonly props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  static create(props: Omit<UserProps, 'id' | 'createdAt'>): UserEntity {
    return new UserEntity({
      ...props,
      id: uuidv4(),
      createdAt: new Date(),
    });
  }

  static restore(props: UserProps): UserEntity {
    return new UserEntity(props);
  }

  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  get passwordHash(): string { return this.props.passwordHash; }
  get name(): string { return this.props.name; }
  get role(): string { return this.props.role; }
  get createdAt(): Date { return this.props.createdAt; }
}
