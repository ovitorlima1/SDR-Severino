import { Code } from '../error/Code';

export class Exception extends Error {
  public readonly code: Code;
  public readonly data?: unknown;

  private constructor(code: Code, message?: string, data?: unknown) {
    super(message || code.message);
    this.code = code;
    this.data = data;
    this.name = 'Exception';
  }

  public static new(code: Code, message?: string, data?: unknown): Exception {
    return new Exception(code, message, data);
  }
}
