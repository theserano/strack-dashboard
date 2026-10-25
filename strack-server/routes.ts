import { Router } from 'express';
import authRoutes from './src/modules/auth/auth.routes';
import userRoutes from './src/modules/user/user.routes';
import statsRoutes from './src/modules/stats/stats.routes';
import customerRoutes from './src/modules/customer/customer.routes';
import transactionRoutes from './src/modules/transaction/transaction.routes';
import paymentLinkRoutes from './src/modules/payment-link/payment-link.routes';
import bankAccountRoutes from './src/modules/bank-account/bank-account.routes';
import payoutRoutes from './src/modules/payout/payout.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/stats', statsRoutes);
router.use('/customers', customerRoutes);
router.use('/payment-links', paymentLinkRoutes);
router.use('/transactions', transactionRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/payouts', payoutRoutes);

export default router;
