import { loginSchema, signupSchema } from './auth.schema';
import { validate } from '../../middlewares/validate.middleware';
import { Router } from "express";
import { loginLimiter, passwordChangeLimiter } from '../../middlewares/rateLimit.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { changePasswordController, loginController, logoutController, refreshTokenController, signupController } from './auth.controller';

const router = Router();

router.post('/signup', validate(signupSchema), signupController);
router.post('/login', loginLimiter, validate(loginSchema), loginController);
router.post('/refresh', refreshTokenController);
router.post('/logout', logoutController);
// Rate-limited per account; the limiter runs after the token check so it can key on the user id.
router.post(
  '/password',
  authMiddleware((req, res, next) =>
    passwordChangeLimiter(req, res, (err?: unknown) => (err ? next(err) : changePasswordController(req, res)))
  )
);

export default router;