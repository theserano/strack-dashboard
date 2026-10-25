import { Router } from 'express';
import { getOverviewController } from './stats.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

// Mounted at /strack-api/stats
const router = Router();

router.get('/overview', authMiddleware(getOverviewController)); // GET /stats/overview?from=&to=&interval=

export default router;
