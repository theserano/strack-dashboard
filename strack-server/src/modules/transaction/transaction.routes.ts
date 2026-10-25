import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  getTransactionController,
  listTransactionsController,
  refundTransactionController,
  updateTransactionController,
} from './transaction.controller';

// Mounted at /strack-api/transactions. The owner always comes from the access token.
const router = Router();

router.get('/', authMiddleware(listTransactionsController)); // ?page=&limit=&search=&status=&type=&from=&to=&tz=&customerId=&paymentLinkId=
router.get('/:id', authMiddleware(getTransactionController));
router.patch('/:id', authMiddleware(updateTransactionController));
router.post('/:id/refund', authMiddleware(refundTransactionController));

export default router;
