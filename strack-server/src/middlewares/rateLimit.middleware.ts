import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Request } from 'express';

const WINDOW_MS = 15 * 60 * 1000;

// In-memory store: counts are per server process and reset on restart. Put a shared store (e.g. Redis)
// behind this when running several instances. Behind a proxy, set `trust proxy` so req.ip is the client.
const limiter = (max: number, message: string, keyGenerator: (req: Request) => string) =>
  rateLimit({
    windowMs: WINDOW_MS,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: (_req, res) => {
      res.status(429).json({ message });
    },
  });

/** Password change: 5 attempts per 15 minutes per account. Must run after authMiddleware (needs req.user). */
export const passwordChangeLimiter = limiter(
  5,
  'Too many password change attempts. Please try again in 15 minutes.',
  (req) => `pw:${req.user?.userId ?? ipKeyGenerator(req.ip ?? '')}`
);

/** Login: 10 attempts per 15 minutes per IP + email, so one address cannot be guessed from many IPs' worth of budget and one IP cannot lock everyone out. */
export const loginLimiter = limiter(
  10,
  'Too many login attempts. Please try again in 15 minutes.',
  (req) => `login:${ipKeyGenerator(req.ip ?? '')}|${String(req.body?.email ?? '').trim().toLowerCase()}`
);
