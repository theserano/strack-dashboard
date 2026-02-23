import { Router } from 'express';
import { getUserController } from './user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/user', authMiddleware(getUserController));

export default router;