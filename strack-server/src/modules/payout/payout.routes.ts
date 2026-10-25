import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createPayoutController, getPayoutController, listPayoutsController } from './payout.controller';

// Mounted at /strack-api/payouts. The owner always comes from the access token.
const router = Router();

router.get('/', authMiddleware(listPayoutsController)); // ?page=&limit=&status=&from=&to=&tz=
router.post('/', authMiddleware(createPayoutController));
router.get('/:id', authMiddleware(getPayoutController));

export default router;
