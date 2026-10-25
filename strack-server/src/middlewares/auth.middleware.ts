import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { UserModel } from '../modules/user/user.schema';

export const authMiddleware = (handler: (req: Request, res: Response, next: NextFunction) => unknown) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    let payload: { userId: string; accountType: 'individual' | 'business'; tokenVersion?: number };
    try {
      payload = verifyAccessToken(token) as typeof payload;
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    try {
      // Cheap lookup: only the version. A password change bumps it and so signs out every other session.
      const user = await UserModel.findById(payload.userId).select('tokenVersion').lean();
      if (!user || (user.tokenVersion ?? 0) !== (payload.tokenVersion ?? 0)) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    req.user = payload;
    // Return the handler's promise so Express 5 routes a rejection to the error handler instead of crashing.
    return handler(req, res, next);
  };
};
