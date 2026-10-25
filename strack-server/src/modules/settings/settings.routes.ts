import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { getSettingsController, updateSettingsController } from './settings.controller';

// Mounted at /strack-api/settings. The owner always comes from the access token.
const router = Router();

router.get('/', authMiddleware(getSettingsController));
router.patch('/', authMiddleware(updateSettingsController));

export default router;
