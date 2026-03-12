export class Code {
  public readonly code: number;
  public readonly message: string;

  private constructor(code: number, message: string) {
    this.code = code;
    this.message = message;
  }

  public static readonly SUCCESS = new Code(200, 'Success');
  public static readonly CREATED = new Code(201, 'Created');
  public static readonly BAD_REQUEST = new Code(400, 'Bad request');
  public static readonly UNAUTHORIZED = new Code(401, 'Unauthorized');
  public static readonly FORBIDDEN = new Code(403, 'Forbidden');
  public static readonly NOT_FOUND = new Code(404, 'Not found');
  public static readonly CONFLICT = new Code(409, 'Conflict');
  public static readonly INTERNAL_ERROR = new Code(500, 'Internal server error');
  public static readonly VALIDATION_ERROR = new Code(422, 'Validation error');
}
