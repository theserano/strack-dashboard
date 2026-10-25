import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  createBankAccountController,
  deleteBankAccountController,
  getBankAccountController,
  listBankAccountsController,
  updateBankAccountController,
} from './bank-account.controller';

// Mounted at /strack-api/bank-accounts. The owner always comes from the access token.
const router = Router();

router.get('/', authMiddleware(listBankAccountsController)); // ?page=&limit=
router.post('/', authMiddleware(createBankAccountController));
router.get('/:id', authMiddleware(getBankAccountController));
router.patch('/:id', authMiddleware(updateBankAccountController));
router.delete('/:id', authMiddleware(deleteBankAccountController));

export default router;
