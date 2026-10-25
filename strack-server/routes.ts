import { Router } from 'express';
import authRoutes from './src/modules/auth/auth.routes';
import userRoutes from './src/modules/user/user.routes';
import statsRoutes from './src/modules/stats/stats.routes';
import customerRoutes from './src/modules/customer/customer.routes';
import transactionRoutes from './src/modules/transaction/transaction.routes';
import paymentLinkRoutes from './src/modules/payment-link/payment-link.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/stats', statsRoutes);
router.use('/customers', customerRoutes);
router.use('/payment-links', paymentLinkRoutes);
router.use('/transactions', transactionRoutes);

export default router;
