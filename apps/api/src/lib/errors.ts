export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}
export const badRequest = (m = "Bad request", code = "bad_request") => new HttpError(400, m, code);
export const unauthorized = (m = "Unauthorized", code = "unauthorized") => new HttpError(401, m, code);
export const forbidden = (m = "Forbidden", code = "forbidden") => new HttpError(403, m, code);
export const notFound = (m = "Not found", code = "not_found") => new HttpError(404, m, code);
export const conflict = (m = "Conflict", code = "conflict") => new HttpError(409, m, code);
