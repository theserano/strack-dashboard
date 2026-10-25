import { Router } from 'express';
import authRoutes from './src/modules/auth/auth.routes';
import userRoutes from './src/modules/user/user.routes';
import statsRoutes from './src/modules/stats/stats.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/stats', statsRoutes);

export default router;
