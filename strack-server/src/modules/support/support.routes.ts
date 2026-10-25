import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  closeTicketController,
  createTicketController,
  getTicketController,
  listTicketsController,
  replyTicketController,
} from './support.controller';

// Mounted at /strack-api/support. The owner always comes from the access token.
const router = Router();

router.get('/', authMiddleware(listTicketsController)); // ?page=&limit=&status=&search=
router.post('/', authMiddleware(createTicketController));
router.get('/:id', authMiddleware(getTicketController));
router.post('/:id/replies', authMiddleware(replyTicketController));
router.post('/:id/close', authMiddleware(closeTicketController));

export default router;
