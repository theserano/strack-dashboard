import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  createCustomerController,
  deleteCustomerController,
  getCustomerController,
  listCustomersController,
  updateCustomerController,
} from './customer.controller';

// Mounted at /strack-api/customers. The owner always comes from the access token.
const router = Router();

router.get('/', authMiddleware(listCustomersController)); // ?page=&limit=&search=
router.post('/', authMiddleware(createCustomerController));
router.get('/:id', authMiddleware(getCustomerController));
router.patch('/:id', authMiddleware(updateCustomerController));
router.delete('/:id', authMiddleware(deleteCustomerController));

export default router;
