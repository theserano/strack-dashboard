import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  createPaymentController,
  createPaymentLinkController,
  deletePaymentLinkController,
  getPaymentLinkController,
  listPaymentLinksController,
  updatePaymentLinkController,
} from './payment-link.controller';

// Mounted at /strack-api/payment-links. The owner always comes from the access token.
const router = Router();

router.get('/', authMiddleware(listPaymentLinksController)); // ?page=&limit=&search=&status=
router.post('/', authMiddleware(createPaymentLinkController));
router.get('/:id', authMiddleware(getPaymentLinkController));
router.patch('/:id', authMiddleware(updatePaymentLinkController));
router.delete('/:id', authMiddleware(deletePaymentLinkController));
router.post('/:id/payments', authMiddleware(createPaymentController));

export default router;
