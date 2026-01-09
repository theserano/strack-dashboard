import { ZodObject } from 'zod';

export const validate =
  (schema: ZodObject) =>
  (req: { body: unknown; }, _res: any, next: () => void) => {
    schema.parse(req.body);
    next();
  };
