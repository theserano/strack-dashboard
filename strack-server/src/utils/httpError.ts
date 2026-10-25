/** An error that carries the HTTP status the controller should respond with. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Maps any thrown error to a status and message. */
export const toErrorResponse = (error: unknown) => {
  // 5xx details stay in the server log (controllers log them); clients get a generic message.
  if (error instanceof HttpError) {
    return { status: error.status, message: error.status >= 500 ? 'Internal Server Error' : error.message };
  }
  // Mongo duplicate key, e.g. an email or phone that another account already uses.
  if ((error as { code?: number })?.code === 11000) {
    const field = Object.keys((error as { keyValue?: object }).keyValue ?? {})[0] ?? 'value';
    return { status: 409, message: `That ${field} is already in use` };
  }
  return { status: 500, message: 'Internal Server Error' };
};
