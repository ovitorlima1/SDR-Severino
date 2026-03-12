export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

export class CoreApiResponse<TData> {
  public readonly message: string;
  public readonly code: number;
  public readonly timestamp: string;
  public readonly data: TData;

  private constructor(code: number, message: string, data?: TData) {
    this.code = code;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.data = data as TData;
  }

  public static success<TData>(data?: TData, message?: string): CoreApiResponse<TData> {
    return new CoreApiResponse(200, message || 'OK', data);
  }

  public static created<TData>(data?: TData, message?: string): CoreApiResponse<TData> {
    return new CoreApiResponse(201, message || 'Created', data);
  }

  public static error(code: number, message: string): CoreApiResponse<null> {
    return new CoreApiResponse(code, message, null);
  }
}
