import { loginSchema, signupSchema } from './auth.schema';
import { validate } from '../../middlewares/validate.middleware';
import { Router } from "express";
import { loginController, refreshTokenController, signupController } from './auth.controller';

const router = Router();

router.post('/signup', validate(signupSchema), signupController);
router.post('/login', validate(loginSchema), loginController);
router.post('/refresh', refreshTokenController);

export default router;