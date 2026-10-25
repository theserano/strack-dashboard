import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { listActivityController } from './activity.controller';

// Mounted at /strack-api/activity. Read-only: events are written by the other modules.
const router = Router();

router.get('/', authMiddleware(listActivityController)); // ?page=&limit=&search=&entity=&from=&to=&tz=

export default router;
