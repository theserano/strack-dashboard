import { loginSchema, signupSchema } from './auth.schema';
import { validate } from '../../middlewares/validate.middleware';
import { Router } from "express";
import { authMiddleware } from '../../middlewares/auth.middleware';
import { changePasswordController, loginController, logoutController, refreshTokenController, signupController } from './auth.controller';

const router = Router();

router.post('/signup', validate(signupSchema), signupController);
router.post('/login', validate(loginSchema), loginController);
router.post('/refresh', refreshTokenController);
router.post('/logout', logoutController);
// TODO: rate-limit this endpoint (and /login) to slow password guessing; out of scope for this change.
router.post('/password', authMiddleware(changePasswordController));

export default router;